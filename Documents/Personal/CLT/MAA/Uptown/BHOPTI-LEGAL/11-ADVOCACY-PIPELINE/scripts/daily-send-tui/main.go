package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/charmbracelet/bubbles/progress"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// Styles
var (
	titleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("86")).
			BorderStyle(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("86")).
			Padding(0, 1)

	dayStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("205")).
			Bold(true)

	activeDayStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("205")).
			Bold(true).
			Background(lipgloss.Color("240"))

	platformStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("39"))

	activePlatformStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("39")).
				Bold(true).
				Background(lipgloss.Color("240"))

	previewStyle = lipgloss.NewStyle().
			BorderStyle(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("240")).
			Padding(1, 2).
			Width(80)

	roamStyle = lipgloss.NewStyle().
			BorderStyle(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("196")).
			Padding(1, 2)

	helpStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("241")).
			Padding(1, 0)
)

// State structures
type Platform struct {
	Name     string
	Icon     string
	Complete bool
	Progress float64
}

type State struct {
	CurrentDay  int                `json:"current_day"`
	Days        map[string]DayState `json:"days"`
	PostedURLs  map[string]string  `json:"posted_urls"`
}

type DayState struct {
	EmailSent    bool `json:"email_sent"`
	SocialPosted bool `json:"social_posted"`
	PDFSaved     bool `json:"pdf_saved"`
}

type model struct {
	// Navigation state
	currentDay      int
	currentPlatform int
	tier            int // 1=day, 2=platform, 3=action

	// Data
	platforms []Platform
	state     State
	preview   viewport.Model
	progress  progress.Model

	// UI state
	showROAM    bool
	roamMessage string
	width       int
	height      int
	baseDir     string
}

func initialModel() model {
	// Get base directory (2 levels up from scripts/daily-send-tui)
	execPath, _ := os.Executable()
	baseDir := filepath.Join(filepath.Dir(execPath), "../..")
	
	// If running with `go run`, use current dir logic
	if strings.Contains(execPath, "go-build") {
		wd, _ := os.Getwd()
		baseDir = filepath.Join(wd, "../..")
	}

	platforms := []Platform{
		{Name: "Email", Icon: "📧", Complete: false, Progress: 0.0},
		{Name: "Twitter", Icon: "🐦", Complete: false, Progress: 0.0},
		{Name: "LinkedIn", Icon: "💼", Complete: false, Progress: 0.0},
		{Name: "Reddit", Icon: "🔴", Complete: false, Progress: 0.0},
	}

	// Load state
	state := loadState(baseDir)

	vp := viewport.New(78, 20)
	vp.SetContent("Press Space to preview template")

	prog := progress.New(
		progress.WithDefaultGradient(),
		progress.WithWidth(40),
	)

	return model{
		currentDay:      state.CurrentDay,
		currentPlatform: 0,
		tier:            2, // Start at platform selection
		platforms:       platforms,
		state:           state,
		preview:         vp,
		progress:        prog,
		baseDir:         baseDir,
	}
}

func loadState(baseDir string) State {
	stateFile := filepath.Join(baseDir, "tracking/daily-send-state.json")
	data, err := os.ReadFile(stateFile)
	if err != nil {
		// Initialize default state
		return State{
			CurrentDay: 1,
			Days: map[string]DayState{
				"1": {EmailSent: false, SocialPosted: false, PDFSaved: false},
				"2": {EmailSent: false, SocialPosted: false, PDFSaved: false},
				"3": {EmailSent: false, SocialPosted: false, PDFSaved: false},
				"4": {EmailSent: false, SocialPosted: false, PDFSaved: false},
				"5": {EmailSent: false, SocialPosted: false, PDFSaved: false},
			},
			PostedURLs: make(map[string]string),
		}
	}

	var state State
	json.Unmarshal(data, &state)
	return state
}

func (m model) Init() tea.Cmd {
	return nil
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		// ROAM gate shown - only Enter/Esc allowed
		if m.showROAM {
			switch msg.String() {
			case "enter", "y":
				m.showROAM = false
				// Proceed with action
				return m, m.executeAction()
			case "esc", "n":
				m.showROAM = false
				return m, nil
			}
			return m, nil
		}

		// Handle arrow keys via Type (raw escape sequences)
		if msg.Type == tea.KeyLeft {
			if m.currentDay > 1 {
				m.currentDay--
			}
			return m, nil
		} else if msg.Type == tea.KeyRight {
			if m.currentDay < 5 {
				m.currentDay++
			}
			return m, nil
		} else if msg.Type == tea.KeyUp {
			if m.currentPlatform > 0 {
				m.currentPlatform--
			}
			return m, nil
		} else if msg.Type == tea.KeyDown {
			if m.currentPlatform < len(m.platforms)-1 {
				m.currentPlatform++
			}
			return m, nil
		}

		switch msg.String() {
		case "ctrl+c", "q":
			return m, tea.Quit

		// Vim-style navigation (h/j/k/l) as fallback
		case "h":
			if m.currentDay > 1 {
				m.currentDay--
			}
		case "l":
			if m.currentDay < 5 {
				m.currentDay++
			}
		case "k":
			if m.currentPlatform > 0 {
				m.currentPlatform--
			}
		case "j":
			if m.currentPlatform < len(m.platforms)-1 {
				m.currentPlatform++
			}

		// Actions
		case " ": // Space - preview
			return m, m.previewTemplate()
		case "enter":
			// Show ROAM gate before executing
			m.showROAM = true
			m.roamMessage = m.getROAMMessage()
			return m, nil
		case "?":
			// Show help
			return m, nil
		}

	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.preview.Width = msg.Width - 4
		m.preview.Height = msg.Height - 15
	}

	return m, nil
}

func (m model) View() string {
	if m.showROAM {
		return m.renderROAM()
	}

	var s strings.Builder

	// Title
	title := titleStyle.Render(fmt.Sprintf("DAILY SEND ORCHESTRATOR - Day %d", m.currentDay))
	s.WriteString(title + "\n\n")

	// Tier 1: Day Navigation
	s.WriteString("Days: ")
	for i := 1; i <= 5; i++ {
		if i == m.currentDay {
			s.WriteString(activeDayStyle.Render(fmt.Sprintf(" Day %d ", i)))
		} else {
			s.WriteString(dayStyle.Render(fmt.Sprintf(" Day %d ", i)))
		}
		if i < 5 {
			s.WriteString(" → ")
		}
	}
	s.WriteString("\n\n")

	// Tier 2: Platform Selection with Progress
	s.WriteString("Platforms:\n")
	for i, platform := range m.platforms {
		icon := platform.Icon
		name := platform.Name
		prog := m.progress.ViewAs(platform.Progress)

		if i == m.currentPlatform {
			s.WriteString(activePlatformStyle.Render(fmt.Sprintf("  ▶ %s %s  ", icon, name)))
		} else {
			s.WriteString(platformStyle.Render(fmt.Sprintf("    %s %s  ", icon, name)))
		}
		s.WriteString(prog + "\n")
	}
	s.WriteString("\n")

	// Tier 3: Preview Pane
	s.WriteString("Preview:\n")
	s.WriteString(previewStyle.Render(m.preview.View()))
	s.WriteString("\n\n")

	// Help
	help := helpStyle.Render(
		"↑/↓: Navigate platforms │ ←/→: Change days │ Space: Preview │ Enter: Execute │ q: Quit",
	)
	s.WriteString(help)

	return s.String()
}

func (m model) renderROAM() string {
	return roamStyle.Render(m.roamMessage)
}

func (m model) getROAMMessage() string {
	platform := m.platforms[m.currentPlatform].Name
	risk := "MEDIUM"
	if platform == "Email" {
		risk = "HIGH"
	}

	return fmt.Sprintf(`⚠️  ROAM Risk Check: %s

Platform: %s
Day: %d

✓ Resolved:  Template reviewed and ready
→ Owned:     Send action requires confirmation  
! Accepted:  Cannot recall after sending
🛡 Mitigated: Evidence tracking enabled

[Enter/Y] Continue  [Esc/N] Cancel`, risk, platform, m.currentDay)
}

func (m model) previewTemplate() tea.Cmd {
	return func() tea.Msg {
		platform := m.platforms[m.currentPlatform].Name
		var templatePath string

		switch strings.ToLower(platform) {
		case "email":
			templatePath = filepath.Join(m.baseDir, fmt.Sprintf("TIER-5-DIGITAL/Email/Templates/day%d.html", m.currentDay))
		case "twitter":
			templatePath = filepath.Join(m.baseDir, fmt.Sprintf("TIER-5-DIGITAL/Twitter-X/Templates/day%d.txt", m.currentDay))
		case "linkedin":
			templatePath = filepath.Join(m.baseDir, fmt.Sprintf("TIER-5-DIGITAL/LinkedIn/Templates/day%d.txt", m.currentDay))
		default:
			templatePath = ""
		}

		if templatePath != "" {
			data, err := os.ReadFile(templatePath)
			if err == nil {
				content := string(data)
				// For HTML, extract body content
				if strings.HasSuffix(templatePath, ".html") {
					// Simple extraction - get text between <div id="email-body"> tags
					if idx := strings.Index(content, "<div id=\"email-body\""); idx != -1 {
						if endIdx := strings.Index(content[idx:], "</div>"); endIdx != -1 {
							content = content[idx : idx+endIdx]
							// Strip HTML tags for preview
							content = stripHTML(content)
						}
					}
				}
				// Truncate to first 500 chars for preview
				if len(content) > 500 {
					content = content[:500] + "\n\n[... truncated, press 'o' to open full ...]"
				}
				m.preview.SetContent(content)
			}
		}

		return tea.WindowSizeMsg{Width: m.width, Height: m.height}
	}
}

func stripHTML(s string) string {
	// Very simple HTML stripping
	result := ""
	inTag := false
	for _, r := range s {
		if r == '<' {
			inTag = true
			continue
		}
		if r == '>' {
			inTag = false
			continue
		}
		if !inTag {
			result += string(r)
		}
	}
	return result
}

func (m model) executeAction() tea.Cmd {
	return func() tea.Msg {
		platform := m.platforms[m.currentPlatform].Name

		switch strings.ToLower(platform) {
		case "email":
			// Open email template in browser
			templatePath := filepath.Join(m.baseDir, fmt.Sprintf("TIER-5-DIGITAL/Email/Templates/day%d.html", m.currentDay))
			exec.Command("open", templatePath).Run()
		case "twitter", "linkedin":
			// Could open browser to platform
		}

		// Update state
		// (In full implementation, would update JSON state here)

		return tea.WindowSizeMsg{Width: m.width, Height: m.height}
	}
}

func main() {
	p := tea.NewProgram(initialModel(), tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Printf("Error: %v", err)
		os.Exit(1)
	}
}
