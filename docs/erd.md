# Data Model / ERD

```mermaid
erDiagram
    COURIERS ||--o{ SHIFTS : "works"
    COURIERS ||--o{ ORDERS : "delivers"
    COURIERS ||--o{ TRANSACTIONS : "earns/withdraws"
    SHIFTS ||--o{ ORDERS : "contains"
    ORDERS ||--o{ ORDER_ITEMS : "contains"
    ORDERS ||--o{ TRANSACTIONS : "generates"
    ORDERS ||--o{ MESSAGES : "has chat"

    COURIERS {
        int id PK
        string workId
        string name
        string email
        string passwordHash
        string team
        string transportation
        string vehicleNumber
        int level
        int ratePercent
        string avatarUrl
    }

    SHIFTS {
        int id PK
        int courierId FK
        string startedAt
        string endedAt
        string status
        real earned
        real tips
        int deliveriesCompleted
    }

    ORDERS {
        int id PK
        string orderNumber
        int courierId FK
        int shiftId FK
        string status
        string pickupName
        string pickupAddress
        string customerName
        string customerPhone
        string destinationAddress
        real total
        real courierEarning
        real tip
        string paymentMethod
        int etaMinutes
        real distanceLeftKm
    }

    ORDER_ITEMS {
        int id PK
        int orderId FK
        string name
        real price
        string notes
    }

    TRANSACTIONS {
        int id PK
        int courierId FK
        int orderId FK
        string type
        real amount
    }

    MESSAGES {
        int id PK
        int orderId FK
        string sender
        string text
    }
```

**Why SQLite for this assessment:** the delivery-buddy app's data (couriers, shifts,
orders, wallet transactions) is inherently relational — orders belong to couriers,
transactions belong to orders, etc. SQLite gives that relational structure with zero
setup cost (no separate DB server to run/host), which matters given the assessment's
timeframe. For production, this schema would map directly onto Postgres.
