-- CreateEnum
CREATE TYPE "StopType" AS ENUM ('PICKUP', 'DROPOFF');

-- CreateTable
CREATE TABLE "trip_stops" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" "StopType" NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "trip_stops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_stops_tripId_idx" ON "trip_stops"("tripId");

-- AddForeignKey
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
