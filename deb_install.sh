#!/bin/sh

curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
apt-get install -y nodejs

apt-get update
apt-get install -y libcairo2-dev libjpeg-dev libgif-devS
