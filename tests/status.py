#!/usr/bin/env python

import socket


TCP_IP = '127.0.0.1'
TCP_PORT = 10996
BUFFER_SIZE = 1024
MSGSREPLIES = [
        ("", "{"code":200,"type":"status"}\r\n"),
        ("q,sup,;\n", "q,200,;\n")
]

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect((TCP_IP, TCP_PORT))
for msgreply in MSGSREPLIES:
    s.send(msgreply[0])
    print "sent data:", repr(msgreply[0])
    data = s.recv(BUFFER_SIZE)
    print "received data:", repr(data)
    if data != msgreply[1]:
     raise AssertionError("Expected {} but got {}".format(repr(msgreply[1]), repr(data)))
s.close()

