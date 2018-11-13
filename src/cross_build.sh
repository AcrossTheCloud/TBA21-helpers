#!/usr/bin/env bash

docker run -v $(PWD):/var/task --rm matthewberryman/lambda-node-build make
mv dcraw ../bin