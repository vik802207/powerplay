# 🎟️ TicketBoss — Real-Time Event Ticketing API

TicketBoss is a lightweight **event-ticketing API** built using **Node.js + Express** that demonstrates **optimistic concurrency control** to safely handle real-time seat reservations without overselling.  
Partners can reserve or cancel seats instantly and get an immediate response — no queues or delayed confirmations.

---

## 🚀 Features

- **500-seat event system** (seeded on first run)
- **Optimistic concurrency control** to prevent overselling
- **Atomic updates** using version-based Compare-And-Set (CAS)
- **Instant partner responses** (accept or deny)
- **Seat release on cancellation**
- **Fully RESTful JSON API**
- **File-based lightweight persistence (db.json)**

---

## 🧱 Project Structure
``` bash
ticketboss/
├── index.js # Main application entry point
├── db.json # Auto-generated database file (seeded on first start)
├── package.json # Dependencies and scripts
└── README.md # Documentation
```

---

## ⚙️ Setup Instructions

1️⃣ **Clone the repository**
```bash
git clone https://github.com/<your-username>/ticketboss.git
cd ticketboss
npm install
node index.js
```
## 🧩 Seed Data (auto-created on first start)
```bash
{
  "event": {
    "eventId": "node-meetup-2025",
    "name": "Node.js Meet-up",
    "totalSeats": 500,
    "availableSeats": 500,
    "version": 0
  },
  "reservations": {}
}
```
## 🔗 API Documentation
### 1 POST /reservations → Reserve Seats
``` bash
Request Body

{
  "partnerId": "abc-corp",
  "seats": 3
}


Validations

partnerId → required, string

seats → integer between 1 and 10

Responses

✅ 201 Created

{
  "reservationId": "7d4f36be-ef9b-4bb6-b3a5-6378a9d6a1f9",
  "seats": 3,
  "status": "confirmed"
}


❌ 400 Bad Request

{ "error": "seats must be between 1 and 10" }


❌ 409 Conflict

{ "error": "Not enough seats left" }
```
## 2 DELETE /reservations/:reservationId → Cancel Reservation
``` bash
Request

DELETE /reservations/7d4f36be-ef9b-4bb6-b3a5-6378a9d6a1f9


Responses

✅ 204 No Content

(seats returned to pool)


❌ 404 Not Found

{ "error": "Reservation not found or already cancelled" }


❌ 500 Internal Server Error

{ "error": "Could not cancel reservation due to concurrent updates. Please retry." }
```
## 3 GET /reservations → View All Reservations
``` bash
Response

[
  {
    "reservationId": "7d4f36be-ef9b-4bb6-b3a5-6378a9d6a1f9",
    "partnerId": "abc-corp",
    "seats": 3,
    "status": "confirmed",
    "ts": "2025-10-28T13:45:00.853Z",
    "eventVersionAtReservation": 2
  },
  {
    "reservationId": "b2a68c77-fc83-4a9b-bb2b-24d91e4083e0",
    "partnerId": "xyz-ltd",
    "seats": 2,
    "status": "cancelled",
    "cancelledAt": "2025-10-28T14:20:11.923Z"
  }
]
```
## 4 GET /event → Event Summary
``` bash
Response

{
  "eventId": "node-meetup-2025",
  "name": "Node.js Meet-up",
  "totalSeats": 500,
  "availableSeats": 492,
  "reservationCount": 8,
  "version": 3
}
```

## 4 GET /_health → Health Check
``` bash
Response

{ "ok": true }

```
## ScreenShot
![Screenshot of TicketBoss UI](https://github.com/vik802207/powerplay/blob/main/img/Screenshot%20(875).png?raw=true)
![Screenshot of TicketBoss UI](https://github.com/vik802207/powerplay/blob/main/img/Screenshot%20(876).png?raw=true)
![Screenshot of TicketBoss UI](https://github.com/vik802207/powerplay/blob/main/img/Screenshot%20(877).png?raw=true)
![Screenshot of TicketBoss UI](https://github.com/vik802207/powerplay/blob/main/img/Screenshot%20(878).png?raw=true)
![Screenshot of TicketBoss UI](https://github.com/vik802207/powerplay/blob/main/img/Screenshot%20(879).png?raw=true)















