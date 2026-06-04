# Rsyslog Client Configuration - TLS Forwarding
# Off-Host Syslog Black Box Recorder

# Load required modules
module(load="omrelp")
module(load="gtls")

# Global TLS settings
global(
    DefaultNetstreamDriver="gtls"
    DefaultNetstreamDriverCAFile="/etc/ssl/certs/syslog-ca.crt"
    DefaultNetstreamDriverCertFile="/etc/ssl/certs/syslog-client.crt"
    DefaultNetstreamDriverKeyFile="/etc/ssl/private/syslog-client.key"
)

# Forward authpriv and sudo
if $syslogfacility-text == 'authpriv' or $programname == 'sudo' then {
    action(type="omrelp" target="${syslog_server}" port="${syslog_port}" tls="on"
        ActionResumeRetryCount="-1"
        ActionQueueType="LinkedList"
        ActionQueueFileName="tls-auth-sudo")
    stop
}

# Forward warnings and errors (excluding authpriv)
# Severity <= 4 means warning, error, critical, alert, emergency
if ($syslogseverity <= 4) and ($syslogfacility-text != 'authpriv') then {
    action(type="omrelp" target="${syslog_server}" port="${syslog_port}" tls="on"
        ActionResumeRetryCount="-1"
        ActionQueueType="LinkedList"
        ActionQueueFileName="tls-system-warn")
    stop
}
