# DANALOG Backend API Design
This document outlines the API endpoints required for the Audit & Management features.

## 1. Ticket Management (CS Staff)

### GET /api/tickets/pending
Retrieves list of tickets waiting for approval.
- **Query Params**: `page`, `limit`, `driverId` (optional)
- **Response**:
  ```json
  {
    "data": [
      {
        "id": "T1001",
        "date_start": "2023-10-25",
        "date_end": "2023-10-26",
        "license_plate": "29C-123.45",
        "customer_name": "Samsung",
        "cont_no": "SUDU1234567",
        "route": "Hai Phong - Thai Nguyen",
        "size": "40F",
        "fe": "F",
        "trips": 1,
        "image_url": "https://...",
        "status": "PENDING"
      }
    ]
  }
  ```

### PUT /api/tickets/:id
Updates ticket information before approval.
- **Body**: `{ "route": "...", "fe": "...", "date_end": "..." }`
- **Logic**: Only allowed if status is `PENDING`.

### POST /api/tickets/:id/approve
Approves the ticket.
- **Body**: `{ "cs_signature": "0x..." }` (Optional: if we want to relay tx, otherwise Frontend handles chain interaction and sends txHash)
- **Better Approach**: 
    1. Client calls this to lock the record in DB and get calculated Revenue/Salary.
    2. Client calls Smart Contract `approveTicket()`.
    3. Client sends Transaction Hash back to Backend to confirm.
- **Response**:
    ```json
    { 
        "calculated_revenue": 5000000, 
        "calculated_salary": 800000,
        "data_hash": "0x123..." // Hash to be signed/sent to contract
    }
    ```

## 2. Revenue Statements

### GET /api/reports/revenue/driver
Generates statement for fuel settlement.
- **Query Params**: `start_date`, `end_date`, `driver_id` (or `license_plate`)
- **Response**: List of trips with calculated Revenue and Salary.
- **Export**: Add `?format=excel` to download .xlsx.

### GET /api/reports/revenue/customer
Generates statement for Accounting/Invoicing.
- **Query Params**: `customer_id`, `month`, `year`
- **Response**: Grouped by Container/Trip.

## 3. Driver Salary Management

### GET /api/salary/summary
Overview of all drivers for a specific month.
- **Query Params**: `month`, `year`
- **Response**:
  ```json
  [
    {
      "driver_id": "D01",
      "name": "Nguyen Van A",
      "license_plate": "29C-123.45",
      "total_trips": 25,
      "total_salary": 25000000,
      "status": "UNPAID" // or PAID
    }
  ]
  ```

### GET /api/salary/detail/:driver_id
Detailed breakdown for a driver.
- **Response**:
  ```json
  {
    "lines": [
      { "type": "Transport 40F", "quantity": 10, "unit_price": 500000, "total": 5000000 },
      { "type": "Overnight Fee", "quantity": 2, "unit_price": 200000, "total": 400000 }
    ],
    "total_salary": 5400000
  }
  ```

### POST /api/salary/pay/:driver_id
Marks salary as PAID.
- **Constraint**: Cannot edit salary details after this.
