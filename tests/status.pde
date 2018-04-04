/**
 * HTTP Client.
 *
 * Starts a network client that connects to a server on port 80,
 * sends an HTTP 1.0 GET request, and prints the results.
 *
 * Note that this code is not necessary for simple HTTP GET request:
 * Simply calling loadStrings("http://www.processing.org") would do
 * the same thing as (and more efficiently than) this example.
 * This example is for people who might want to do something more
 * complicated later.
 */


import processing.net.*;

Client c;
String data;

void setup() {
  size(200, 200);
  background(50);
  fill(200);
  c = new Client(this, "127.0.0.1", 10996); // Connect to server on port 80
  c.write("q,sup,;\n"); // Use the HTTP "GET" command to ask for a Web page
}

void draw() {
  if (c.available() > 0) { // If there's incoming data from the client...
    data = c.readString(); // ...then grab it and print it
    println(data);
  }
}