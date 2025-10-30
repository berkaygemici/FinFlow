# Network Troubleshooting Guide for AI Categorization

## Problem
The AI categorization feature is failing because it cannot connect to OpenAI's API. You're seeing errors like:
- `ConnectTimeoutError: Connect Timeout Error`
- `ETIMEDOUT` error code
- All transactions being categorized as "Other"

## Root Cause
Your network is blocking or timing out connections to `api.openai.com` (Cloudflare IPs: 172.66.0.243:443, 162.159.140.245:443).

## Solutions (Try in order)

### 1. Check Your Internet Connection
- Verify you have active internet access
- Try accessing https://api.openai.com in your browser
- Test with: `curl https://api.openai.com/v1/models -H "Authorization: Bearer YOUR_API_KEY"`

### 2. Check Firewall Settings
**Windows Defender Firewall:**
1. Open Windows Security → Firewall & network protection
2. Click "Allow an app through firewall"
3. Ensure Node.js and your terminal have network access
4. Temporarily disable firewall to test (remember to re-enable)

### 3. Try a VPN
If you're in a region where OpenAI is restricted:
- Use a VPN to connect through a supported region
- Common VPN services: NordVPN, ExpressVPN, ProtonVPN

### 4. Configure Proxy (if behind corporate network)
If you're behind a corporate proxy, add these to your `.env.local`:

```env
HTTP_PROXY=http://your-proxy-server:port
HTTPS_PROXY=http://your-proxy-server:port
```

Or set system environment variables:
```bash
# PowerShell
$env:HTTP_PROXY="http://your-proxy-server:port"
$env:HTTPS_PROXY="http://your-proxy-server:port"

# CMD
set HTTP_PROXY=http://your-proxy-server:port
set HTTPS_PROXY=http://your-proxy-server:port
```

### 5. Check DNS Settings
Try using Cloudflare or Google DNS:
- Cloudflare: 1.1.1.1, 1.0.0.1
- Google: 8.8.8.8, 8.8.4.4

**To change DNS on Windows:**
1. Control Panel → Network and Sharing Center
2. Change adapter settings → Right-click your connection → Properties
3. Select IPv4 → Properties → Use the following DNS server addresses
4. Enter: Preferred: 1.1.1.1, Alternate: 1.0.0.1

### 6. Verify API Key
Test your API key directly:
```bash
node test-openai.js
```

If you see authentication errors (401), your API key might be:
- Expired
- Invalid
- Not having sufficient credits

Get a new key from: https://platform.openai.com/api-keys

### 7. Try Different Network
- Switch from WiFi to mobile hotspot
- Try from a different location
- Use your phone's internet connection

### 8. Check ISP Restrictions
Some ISPs block OpenAI:
- Contact your ISP support
- Check if OpenAI is accessible in your country
- Use a VPN as workaround

### 9. Antivirus Software
Some antivirus programs block API calls:
- Check your antivirus logs
- Temporarily disable to test
- Add Node.js to antivirus whitelist

### 10. Use Alternative AI Provider (Future Solution)
Consider switching to:
- Anthropic Claude API
- Google Gemini API
- Local LLM (Ollama)
- Azure OpenAI (different endpoint)

## Testing After Each Solution

After trying each solution, restart your dev server and test:

```bash
# Stop your dev server (Ctrl+C)
npm run dev

# Then try the AI categorization again
```

## Still Not Working?

If none of these work:
1. Check OpenAI status page: https://status.openai.com
2. Try using curl/Postman to test API directly
3. Contact OpenAI support
4. Consider using a local categorization rule-based system as fallback

## Quick Diagnostic Commands

```bash
# Test DNS resolution
nslookup api.openai.com

# Test connectivity
ping 172.66.0.243

# Test HTTPS connection
curl -v https://api.openai.com

# Check environment variables
echo %HTTP_PROXY%
echo %HTTPS_PROXY%
```
