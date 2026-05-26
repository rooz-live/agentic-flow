import subprocess
import os

HA_CONF = """
global
    log /dev/log local0
    log /dev/log local1 notice
    maxconn 4096
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    retries 3
    timeout connect 5s
    timeout client  50s
    timeout server  50s

frontend http_front
    bind *:80
    mode http
    acl is_gitlab hdr(host) -i git.tag.ooo
    use_backend gitlab_http if is_gitlab
    default_backend cpanel_http

frontend https_front
    bind *:443
    mode tcp
    option tcplog
    tcp-request inspect-delay 5s
    tcp-request content accept if { req_ssl_hello_type 1 }
    acl is_gitlab req_ssl_sni -i git.tag.ooo
    use_backend gitlab_https if is_gitlab
    default_backend cpanel_https

backend gitlab_http
    mode http
    server gitlab 127.0.0.1:8080

backend cpanel_http
    mode http
    server cpanel 192.168.122.237:80

backend gitlab_https
    mode tcp
    server gitlab 127.0.0.1:8443

backend cpanel_https
    mode tcp
    server cpanel 192.168.122.237:443
"""

with open("/tmp/haproxy.cfg", "w") as f:
    f.write(HA_CONF)

cmds = [
    "sudo iptables -t nat -D PREROUTING -p tcp -m multiport --dports 80,443,2082,2083,2086,2087,2095,2096 -d 23.92.79.2 -j DNAT --to-destination 192.168.122.237 || true",
    "sudo iptables -t nat -D PREROUTING -p udp -m multiport --dports 80,443,2082,2083,2086,2087,2095,2096 -d 23.92.79.2 -j DNAT --to-destination 192.168.122.237 || true",
    "sudo iptables -t nat -A PREROUTING -p tcp -m multiport --dports 2082,2083,2086,2087,2095,2096 -d 23.92.79.2 -j DNAT --to-destination 192.168.122.237",
    "sudo iptables -t nat -A PREROUTING -p udp -m multiport --dports 2082,2083,2086,2087,2095,2096 -d 23.92.79.2 -j DNAT --to-destination 192.168.122.237",
    "sudo mv /tmp/haproxy.cfg /etc/haproxy/haproxy.cfg",
    "sudo systemctl enable haproxy",
    "sudo systemctl restart haproxy",
]

for cmd in cmds:
    print(f"Running: {cmd}")
    subprocess.run(cmd, shell=True)
