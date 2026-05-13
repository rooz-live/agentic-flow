#!/bin/bash
export SSHPASS="evg-gjk9xbh6gzp*RNB"
sshpass -e sftp -o StrictHostKeyChecking=no mbo@yo.tag.ooo << !
cd public_html
put -r swarm-core-app/dist/*
!
