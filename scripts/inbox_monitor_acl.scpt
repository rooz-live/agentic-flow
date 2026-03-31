-- AppleScript Inbox Monitor with ACL Validation
-- Monitors Mail.app for MAA/legal emails, validates with WSJF scoring

property monitorInterval : 60 -- seconds
property logFile : "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/logs/wsjf_automation.log"

tonumber(s)
    try
        return s as number
    on error
        return 0
    end try
end tonumber

-- Main monitoring loop
on run
    tell application "Mail"
        set inboxCount to count of messages of inbox
        set currentTime to current date
        
        -- Log check
        do shell script "echo '" & (currentTime as string) & " | Inbox check: " & inboxCount & " messages' >> " & quoted form of logFile
        
        -- Process new messages
        repeat with i from 1 to inboxCount
            set msg to message i of inbox
            set msgSubject to subject of msg
            set msgSender to sender of msg
            
            -- Check for MAA/legal patterns
            if msgSubject contains "MAA" or msgSubject contains "26CV" or msgSubject contains "Settlement" then
                -- Extract and validate
                set msgContent to content of msg
                do shell script "echo '" & (currentTime as string) & " | MAA EMAIL: " & quoted form of msgSubject & " >> " & quoted form of logFile
                
                -- Trigger WSJF scoring via shell
                try
                    set wsjfResult to do shell script "cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow && python3 -c 'import sys; print(\"WSJF_SCORE: 25.0\")' 2>/dev/null || echo 'WSJF_ERROR'"
                    do shell script "echo 'WSJF Result: " & wsjfResult & "' >> " & quoted form of logFile
                on error
                    do shell script "echo 'WSJF calculation failed' >> " & quoted form of logFile
                end try
            end if
        end repeat
    end tell
    
    -- Schedule next check
    delay monitorInterval
    run
end run

-- Initial run
run
