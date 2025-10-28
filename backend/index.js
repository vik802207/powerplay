const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const morgan = require('morgan');

const DB_PATH = path.join(__dirname, 'db.json');
const MAX_SEATS_PER_RESERVATION = 10;
const MAX_CAS_ATTEMPTS = 5;

function createSeedDb() {
  return {
    event: {
      eventId: 'node-meetup-2025',
      name: 'Node.js Meet-up',
      totalSeats: 500,
      availableSeats: 500,
      version: 0
    },
    reservations: {}
  };
}

let db = null;


function loadDb() {
  if (!fs.existsSync(DB_PATH)) {
    db = createSeedDb();
    saveDb();
    return;
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  try {
    db = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse db.json — re-seeding.', e);
    db = createSeedDb();
    saveDb();
  }
}
function reloadDb() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const fresh = JSON.parse(raw);
    db.event = fresh.event;
    db.reservations = fresh.reservations;
  } catch (err) {
    console.error('Failed to reload DB:', err);
  }
}


function saveDb() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}


function tryUpdateEventCAS(updater) {
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    
    const current = JSON.parse(JSON.stringify(db.event));

    const result = updater(current);
    if (!result || !result.success) return { ok: false, reason: result && result.reason };

    const newEvent = result.newEvent;

    
    if (db.event.version !== current.version) {
      
      continue;
    }

   
    db.event = newEvent;
    saveDb();
    return { ok: true, event: newEvent };
  }
  return { ok: false, reason: 'CAS failed after retries' };
}

loadDb();

const app = express();
app.use(bodyParser.json());
app.use(morgan('dev'));


app.post('/reservations', (req, res) => {
    reloadDb();
  const { partnerId, seats } = req.body || {};

  if (!partnerId || typeof partnerId !== 'string') {
    return res.status(400).json({ error: 'partnerId (string) is required' });
  }
  if (!Number.isInteger(seats)) {
    return res.status(400).json({ error: 'seats must be an integer' });
  }
  if (seats <= 0 || seats > MAX_SEATS_PER_RESERVATION) {
    return res.status(400).json({ error: `seats must be between 1 and ${MAX_SEATS_PER_RESERVATION}` });
  }
  const result = tryUpdateEventCAS((eventSnapshot) => {
    if (eventSnapshot.availableSeats < seats) {
      return { success: false, reason: 'Not enough seats' };
    }
    const newEvent = Object.assign({}, eventSnapshot, {
      availableSeats: eventSnapshot.availableSeats - seats,
      version: eventSnapshot.version + 1
    });

    const reservationId = uuidv4();
    const reservation = {
      reservationId,
      partnerId,
      seats,
      status: 'confirmed',
      ts: new Date().toISOString(),
      eventVersionAtReservation: newEvent.version
    };

   
    return { success: true, newEvent, reservation };
  });

  if (!result.ok) {
    if (result.reason === 'Not enough seats') {
      return res.status(409).json({ error: 'Not enough seats left' });
    } else {
      return res.status(409).json({ error: 'Could not complete reservation due to concurrent updates. Please retry.' });
    }
  }

  const reservation = result.event && result.reservation; 

  const reservationId = uuidv4();
  const createdReservation = {
    reservationId,
    partnerId,
    seats,
    status: 'confirmed',
    ts: new Date().toISOString(),
    eventVersionAtReservation: db.event.version
  };
  db.reservations[reservationId] = createdReservation;
  saveDb();

  return res.status(201).json({
    reservationId: createdReservation.reservationId,
    seats: createdReservation.seats,
    status: createdReservation.status
  });
});


app.delete('/reservations/:reservationId', (req, res) => {
reloadDb()
  const { reservationId } = req.params;
  const existing = db.reservations[reservationId];
  if (!existing || existing.status !== 'confirmed') {
    return res.status(404).json({ error: 'Reservation not found or already cancelled' });
  }

  const seatsToReturn = existing.seats;

  const result = tryUpdateEventCAS((eventSnapshot) => {
    const newAvailable = Math.min(eventSnapshot.availableSeats + seatsToReturn, eventSnapshot.totalSeats);
    const newEvent = Object.assign({}, eventSnapshot, {
      availableSeats: newAvailable,
      version: eventSnapshot.version + 1
    });
    return { success: true, newEvent };
  });

  if (!result.ok) {
    return res.status(500).json({ error: 'Could not cancel reservation due to concurrent updates. Please retry.' });
  }

  db.reservations[reservationId].status = 'cancelled';
  db.reservations[reservationId].cancelledAt = new Date().toISOString();
  db.reservations[reservationId].eventVersionAtCancel = db.event.version;
  saveDb();

  return res.status(204).send();
});

app.get('/reservations', (req, res) => {
  const list = Object.values(db.reservations);
  return res.status(200).json(list);
});

app.get('/event', (req, res) => {
  const ev = db.event;
  const seatsReserved = ev.totalSeats - ev.availableSeats;
  return res.status(200).json({
    eventId: ev.eventId,
    name: ev.name,
    totalSeats: ev.totalSeats,
    availableSeats: ev.availableSeats,
    reservationCount: seatsReserved,
    version: ev.version
  });
});
app.get('/',(req,res)=>{
    res.send('Welcome to TicketBoss API');
})
app.get('/_health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TicketBoss running on port ${PORT}`);
});
