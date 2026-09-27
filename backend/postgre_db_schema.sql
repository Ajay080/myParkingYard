-- ============================================
-- Car Parking Booking System - Database Schema
-- PostgreSQL SQL File (NO TRIGGERS)
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role_enum AS ENUM ('user', 'admin', 'superadmin', 'staff');

CREATE TYPE vehicle_type_enum AS ENUM ('Car', 'Bike', 'EV', 'Other');

CREATE TYPE booking_status_enum AS ENUM ('Pending', 'Confirmed', 'Cancelled', 'Completed');

CREATE TYPE spot_status_enum AS ENUM ('Available', 'Occupied', 'Blocked', 'UnderMaintenance');

CREATE TYPE device_status_enum AS ENUM ('Active', 'Inactive', 'Disconnected');

CREATE TYPE device_type_enum AS ENUM ('CCTV', 'ANPR', 'OccupancySensor');

CREATE TYPE payment_status_enum AS ENUM ('Pending', 'Success', 'Failed', 'Refunded');

CREATE TYPE analytics_event_enum AS ENUM (
  'BookingCreated',
  'BookingCancelled',
  'BookingCompleted',
  'PaymentSuccess',
  'PaymentFailed'
);

-- ============================================
-- USERS
-- ============================================

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(150) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    phone       VARCHAR(20)  NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        user_role_enum NOT NULL DEFAULT 'user',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- VEHICLES
-- ============================================

CREATE TABLE vehicles (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    number_plate VARCHAR(50) NOT NULL UNIQUE,
    type         vehicle_type_enum NOT NULL DEFAULT 'Car',
    model        VARCHAR(100),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);

-- ============================================
-- ZONES
-- ============================================

CREATE TABLE zones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    vertices    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SPOTS
-- ============================================

CREATE TABLE spots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id     UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    status      spot_status_enum NOT NULL DEFAULT 'Available',
    vertices    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_spots_zone_name UNIQUE (zone_id, name)
);

CREATE INDEX idx_spots_zone_id ON spots(zone_id);

-- ============================================
-- DEVICES
-- ============================================

CREATE TABLE devices (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(150) NOT NULL,
    zone_id      UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    stream_url   TEXT,
    device_type  device_type_enum NOT NULL DEFAULT 'CCTV',
    status       device_status_enum NOT NULL DEFAULT 'Active',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devices_zone_id ON devices(zone_id);

-- ============================================
-- PRICING
-- ============================================

CREATE TABLE pricing (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id       UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    vehicle_type  vehicle_type_enum NOT NULL,
    price_per_hour NUMERIC(10, 2) NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pricing_zone_vehicle UNIQUE (zone_id, vehicle_type)
);

CREATE INDEX idx_pricing_zone_id ON pricing(zone_id);

-- ============================================
-- BOOKINGS
-- ============================================

CREATE TABLE bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    number_plate    VARCHAR(50) NOT NULL,
    spot_id         UUID NOT NULL REFERENCES spots(id) ON DELETE RESTRICT,
    zone_id         UUID NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    booking_status  booking_status_enum NOT NULL DEFAULT 'Pending',
    amount          NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_id      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_spot_id ON bookings(spot_id);
CREATE INDEX idx_bookings_zone_id ON bookings(zone_id);
CREATE INDEX idx_bookings_time_range ON bookings(start_time, end_time);

-- ============================================
-- PAYMENTS
-- ============================================

CREATE TABLE payments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount           NUMERIC(10, 2) NOT NULL,
    payment_status   payment_status_enum NOT NULL DEFAULT 'Pending',
    payment_gateway  VARCHAR(50),
    transaction_id   VARCHAR(150),
    raw_response     JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);

ALTER TABLE bookings
    ADD CONSTRAINT fk_bookings_payment
    FOREIGN KEY (payment_id)
    REFERENCES payments(id)
    ON DELETE SET NULL;

-- ============================================
-- ANALYTICS EVENTS
-- ============================================

CREATE TABLE analytics_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID REFERENCES bookings(id) ON DELETE CASCADE,
    zone_id     UUID REFERENCES zones(id) ON DELETE SET NULL,
    spot_id     UUID REFERENCES spots(id) ON DELETE SET NULL,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type  analytics_event_enum NOT NULL,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_booking_id ON analytics_events(booking_id);
CREATE INDEX idx_analytics_zone_id ON analytics_events(zone_id);
CREATE INDEX idx_analytics_spot_id ON analytics_events(spot_id);
CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);

-- ============================================
-- END OF FILE
-- ============================================
