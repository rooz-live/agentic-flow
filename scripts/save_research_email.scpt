-- save_research_email.scpt
-- Saves selected emails in Mail.app as .eml files to the research folder

property saveFolder : "~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/RESEARCH"

tell application "Mail"
	set theMessages to selection
	if (count of theMessages) is 0 then
		display alert "No messages selected."
		return
	end if

	-- Resolve the path
	set expandedPath to do shell script "mkdir -p " & quoted form of saveFolder & " && cd " & quoted form of saveFolder & " && pwd"

	repeat with aMessage in theMessages
		set msgSubject to subject of aMessage
		-- Clean the subject for use as a filename
		set cleanSubject to do shell script "echo " & quoted form of msgSubject & " | sed 's/[^a-zA-Z0-9]/_/g'"

		set msgDate to date received of aMessage
		set y to year of msgDate as string
		set m to month of msgDate as integer as string
		if (length of m) is 1 then set m to "0" & m
		set d to day of msgDate as string
		if (length of d) is 1 then set d to "0" & d

		set datePrefix to y & "-" & m & "-" & d
		set fileName to datePrefix & "_" & cleanSubject & ".eml"
		set filePath to expandedPath & "/" & fileName

		set msgSource to source of aMessage

		-- Try to save the file
		try
			set fileRef to open for access POSIX file filePath with write permission
			set eof fileRef to 0
			write msgSource to fileRef starting at eof as string
			close access fileRef
		on error errMsg
			try
				close access POSIX file filePath
			end try
			display alert "Error saving email " & fileName & ": " & errMsg
		end try
	end repeat

	display notification "Saved " & (count of theMessages) & " email(s) to " & saveFolder
end tell
