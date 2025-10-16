# Funding Best Practices for Open Source Projects

This document outlines best practices for setting up, maintaining, and communicating funding options for open source projects. Following these guidelines will help ensure your funding information is clear, accessible, and effectively communicated to potential supporters.

## Table of Contents

1. [File Organization](#file-organization)
2. [Configuration Standards](#configuration-standards)
3. [Documentation Requirements](#documentation-requirements)
4. [Maintenance Guidelines](#maintenance-guidelines)
5. [Platform-Specific Guidelines](#platform-specific-guidelines)

## File Organization

### Configuration File Placement

Place funding configuration files in the following standard locations:

- **package.json**: In the root directory of your project (for Node.js/npm projects)
- **.github/FUNDING.yml**: In the .github directory at the root of your repository (for GitHub projects)

Example directory structure:
```
your-project/
├── .github/
│   └── FUNDING.yml
├── docs/
│   └── FUNDING_BEST_PRACTICES.md
├── package.json
└── README.md
```

### Documentation Placement

- **README.md**: Include a brief "Funding" or "Support" section with core information and links to more details
- **CONTRIBUTING.md**: Consider adding funding information in this file as well
- **docs/**: Store comprehensive funding documentation (like this file) in a docs directory

### Version Control Considerations

- Always commit your funding configuration files to version control
- Track changes to funding options in your changelog
- Consider using semantic versioning for significant changes to funding models
- Avoid placing sensitive information (like personal account numbers) in version-controlled files

## Configuration Standards

### Required and Optional Fields

#### For package.json:

Required fields:
- `type`: Funding platform type
- `url`: URL to your funding page

Optional:
- You can provide a simple URL string or an array of funding options

Example:
```json
{
  "name": "your-package",
  "version": "1.0.0",
  "funding": [
    {
      "type": "github",
      "url": "https://github.com/sponsors/username"
    },
    {
      "type": "patreon",
      "url": "https://www.patreon.com/username"
    }
  ]
}
```

#### For .github/FUNDING.yml:

Required:
- At least one funding platform with a valid username or URL

Example:
```yaml
github: username
patreon: username
open_collective: projectname
custom: ["https://www.buymeacoffee.com/username"]
```

### Format Specifications

Follow these format requirements for different platforms:

| Platform | package.json format | FUNDING.yml format |
|----------|---------------------|-------------------|
| GitHub Sponsors | `{"type": "github", "url": "https://github.com/sponsors/username"}` | `github: username` |
| Patreon | `{"type": "patreon", "url": "https://www.patreon.com/username"}` | `patreon: username` |
| Open Collective | `{"type": "open_collective", "url": "https://opencollective.com/project"}` | `open_collective: project` |
| Ko-fi | `{"type": "ko_fi", "url": "https://ko-fi.com/username"}` | `ko_fi: username` |
| Liberapay | `{"type": "liberapay", "url": "https://liberapay.com/username"}` | `liberapay: username` |
| Tidelift | `{"type": "tidelift", "url": "https://tidelift.com/subscription/pkg/platform-name"}` | `tidelift: platform-name/package-name` |
| Custom | `{"type": "individual", "url": "https://example.com/donate"}` | `custom: ["https://example.com/donate"]` |

### Handling Multiple Funding Sources

- **Priority order**: List your preferred funding methods first
- **Consolidation**: Consider using Open Collective or GitHub Sponsors as primary platforms that can distribute to team members
- **Transparency**: Clearly document how funds from different sources are allocated
- **Limiting options**: Avoid overwhelming users with too many options (3-5 is generally sufficient)

### Security Considerations

- Always use HTTPS for all funding URLs
- Verify links regularly to ensure they haven't been compromised
- Consider setting up monitoring for your funding pages
- Be transparent about how funds are secured and distributed
- Never request direct bank transfers in public documentation

## Documentation Requirements

### README Integration

Include a concise "Funding" or "Support" section in your README with:

```markdown
## Support the Project

This project is maintained by [Developer Name] and is available for free under the [License Name] license.
If you find it useful, please consider supporting its development via:

- [GitHub Sponsors](https://github.com/sponsors/username)
- [Open Collective](https://opencollective.com/project)

For more funding options and details on how your support is used, see our [funding documentation](./docs/FUNDING.md).
```

### Transparency Guidelines

- Clearly state how funds will be used (e.g., development time, server costs, etc.)
- Consider publishing regular reports on fund usage
- Acknowledge sponsors in release notes or a SPONSORS.md file
- Be upfront about how funds are distributed among team members
- If applying to grants or larger funding, document the process transparently

Example transparency statement:
```markdown
### How Funds Are Used

Sponsorships and donations are used to:
- Fund dedicated development time (70%)
- Cover hosting and infrastructure costs (20%)
- Support community events and documentation (10%)

We publish quarterly reports on fund usage in our [OpenCollective page](https://opencollective.com/project).
```

### Required Disclaimers and Notices

- **Tax implications**: Note that donations may not be tax-deductible
- **Expectations**: Clarify that funding doesn't guarantee feature implementation or support
- **Independence**: State whether funding affects your governance or decision-making
- **Commercial relationships**: Disclose if certain funding options involve commercial arrangements

### International Considerations

- Support multiple currencies where possible
- Consider regional payment platforms for international users
- Provide alternative funding options for regions with restricted payment methods
- Be aware of sanctions and legal restrictions regarding international financial transactions
- Consider fiscal hosting options like Open Collective for handling international payments

## Maintenance Guidelines

### Keeping Information Current

- Review all funding links quarterly
- Update platform usernames promptly if they change
- Verify that your funding configurations match across all files
- Set calendar reminders for subscription-based platforms renewal dates
- Create automated tests to verify that funding links are accessible

### Adding or Removing Platforms

When adding a new funding platform:
1. Update both package.json and FUNDING.yml
2. Update documentation to reflect the new option
3. Announce the new funding option in release notes
4. Test the new funding link from different regions

When removing a platform:
1. Provide advance notice to existing sponsors (at least 30 days)
2. Suggest alternative platforms for continued support
3. Document the removal in your changelog
4. Keep a record of past sponsors from discontinued platforms

### Handling Deprecated Methods

- Research alternative platforms before a service shuts down
- Communicate proactively with sponsors about migrations
- Offer guidance for sponsors to transition to new platforms
- Archive data from deprecated platforms for historical reference
- Consider keeping legacy documentation for historical context

### Communication with Contributors

- Announce funding changes in release notes
- Maintain a dedicated communication channel for sponsors
- Send updates to existing sponsors about significant changes
- Be transparent about changes in how funds are allocated
- Consider a dedicated newsletter for financial supporters

## Platform-Specific Guidelines

### GitHub Sponsors

- Complete your GitHub Sponsors profile with detailed information
- Set up multiple tier options with clear benefits
- Enable the "Sponsor" button in your repository
- Consider the GitHub Sponsors Matching Fund program for eligible projects
- Link your FUNDING.yml file correctly to activate the Sponsor button

### npm Funding Field

- Include consistent funding information in all related packages
- Use the `npm fund` command to verify your configuration
- Ensure funding URLs are accessible to package users
- Consider adding funding info in your npm profile
- Test how your funding info appears on npmjs.com

Example npm command:
```bash
# Check funding info for a package
npm fund

# Check funding info for your dependencies
npm fund --which
```

### Integration with Other Platforms

#### Open Collective:
- Consider fiscal hosting options
- Set up clear tiers and goals
- Enable recurring contributions
- Publish transparent expense reports

#### Patreon:
- Create meaningful membership tiers
- Offer tangible benefits where possible
- Post regular updates for patrons
- Consider integration with Discord or other community platforms

#### Ko-fi & Buy Me a Coffee:
- Simplify one-time donation options
- Set up "goals" for specific features or milestones
- Enable recurring support options if available
- Customize your profile with project screenshots and demos

### Testing Funding Links

Before publishing:
1. Test all funding links from an incognito/private browser window
2. Verify platform fees and payment processing fees are understood
3. Test the donation/sponsorship flow as a user would experience it
4. Check mobile compatibility for all funding pages
5. Verify that funding platforms are accessible in your target regions

## Conclusion

Implementing these best practices will help you establish a sustainable funding model for your open source project. Remember that transparency, communication, and consistency are key to building trust with your supporters.

By maintaining clear, up-to-date funding information across all your project documents and platforms, you make it easier for users who value your work to support its continued development.

---

*This document was last updated on May 6, 2025. Funding practices evolve over time, so check for updated guidelines periodically.*

