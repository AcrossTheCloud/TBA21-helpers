/* Schema for TBA21 image/video */

-- Schema name
CREATE SCHEMA tba21;

-- Geospatial support
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;

-- Cryptographic support
CREATE extension pgcrypto;

-- Events table
CREATE TABLE tba21.images
(
  id bigserial PRIMARY KEY,
  decodedSrcKey varchar,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  metadata jsonb NOT NULL
);

-- Events geometry
SELECT AddGeometryColumn ('tba21','images','the_geom',4326,'POINT',2);
ALTER TABLE tba21.images ALTER COLUMN the_geom SET NOT NULL;
