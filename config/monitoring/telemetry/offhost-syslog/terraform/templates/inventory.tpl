# Ansible Inventory for Off-Host Syslog Black Box Recorder

[syslog_sink]
${syslog_server} ansible_user=root ansible_port=22

[syslog_client]
${syslog_client} ansible_user=ubuntu ansible_port=22

[all:vars]
ansible_python_interpreter=/usr/bin/python3
admin_ip=${admin_ip}
syslog_port=6514
