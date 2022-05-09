# Liveness v3 demo

## Installation
Run `npm install`

Define `OCR_LABS_AUTH_URL`, `OCR_LABS_STREAMING_API_KEY`, and `OCR_LABS_STREAMING_URL` in `api.tsx`. (This would have been done using a .env file, but I didn't have time to get that working easily.)

## Running the webapp

Run `npm start`, which runs the app in the development mode.\
Open [http://localhost:3030](http://localhost:3030) to view it in your browser.

The page will reload when you make changes.

## Accessing webapp from a mobile device

The easiest way to view the webapp on a phone is to use [ngrok](https://ngrok.com/download).
When your webapp is running, run `ngrok http 3030 --host-header="localhost:3030"`. Navigate to the forwarding URL (in the ngrok output) on your phone. It should load the webapp without any issues.

## The Problem

When starting a liveness session, the video element temporarily shows a black screen.

[![See the problem](./demo_in_action.mov)](./demo_in_action.mov)