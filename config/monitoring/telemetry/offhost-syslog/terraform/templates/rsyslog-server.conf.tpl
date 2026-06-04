# Rsyslog Server Configuration - TLS Sink
# Off-Host Syslog Black Box Recorder

# Load required modules
module(load="imrelp")
module(load="omfile")
module(load="gtls")

# Global settings
$WorkDirectory /var/spool/rsyslog
$ActionQueueType LinkedList
$ActionQueueFileName fwdRule1
$ActionResumeRetryCount -1

# TLS server input on port ${syslog_port}
input(type="imrelp" port="${syslog_port}" tls="on"
    tls.permittedpeer=["stx-aio-0.corp.interface.tag.ooo"]
    tls.caFile="/etc/ssl/certs/syslog-ca.crt"
    tls.myPrivKeyFile="/etc/ssl/private/syslog-server.key"
    tls.myCertFile="/etc/ssl/certs/syslog-server.crt"
    tls.authmode="x509/name"
)

# Separate authpriv and sudo to auth-sudo.log (30-day retention)
if $syslogfacility-text == 'authpriv' or $programname == 'sudo' then {
    action(type="omfile" file="${log_dir}/auth-sudo.log")
    stop
}

# Separate warnings and errors to system-warn.log (7-day retention)
# Severity <= 4 means warning, error, critical, alert, emergency
if ($syslogseverity <= 4) and ($syslogfacility-text != 'authpriv') then {
    action(type="omfile" file="${log_dir}/system-warn.log")
    stop
}

# Discard all other messages (we only want authpriv/sudo and warnings+)
if $msg contains '' then {
    stop
}
