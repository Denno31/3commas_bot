# Crypto Rebalancing Bot

A Python-based cryptocurrency rebalancing bot that integrates with 3Commas to automatically monitor and trade crypto pairs based on configurable price thresholds.

## Features

- Multi-bot support for managing different trading strategies
- Direct integration with 3Commas API
- Real-time price monitoring
- Configurable trading thresholds and intervals
- Paper trading mode for safe testing
- Comprehensive logging and analytics
- State persistence across restarts

## Prerequisites

1. Python 3.8 or higher
2. 3Commas account with API access
3. Virtual environment (recommended)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd crypto_rebalancer
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate  # Windows
   source venv/bin/activate  # Linux/Mac
   ```

3. Install dependencies:
   ```bash
   pip install py3cw pyyaml loguru schedule websockets requests python-dotenv
   ```

## Configuration

1. Get your 3Commas API credentials:
   - Log in to 3Commas
   - Go to API Keys section
   - Create new API key with trading permissions

2. Get your 3Commas account ID:
   ```bash
   python get_account_id.py
   ```

3. Configure `config.yaml`:
   ```yaml
   3commas:
     api_key: "YOUR_API_KEY"
     api_secret: "YOUR_API_SECRET"
     mode: "paper"  # paper or real

   bots:
     - name: "Bot 1"
       enabled: true
       coins:
         - BTC_USDT
         - ETH_USDT
         - SOL_USDT
       threshold_percentage: 10
       check_interval: 5  # minutes
       initial_coin: "BTC_USDT"
       account_id: "YOUR_ACCOUNT_ID"
   ```

## Running the Bot

1. Create required directories:
   ```bash
   mkdir data\bot_states data\analytics logs
   ```

2. Start the bot:
   ```bash
   python bot.py
   ```

3. Monitor logs:
   ```bash
   # Windows PowerShell
   Get-Content -Path logs\bot.log -Tail 20 -Wait
   ```

## Directory Structure

```
├── data/
│   ├── bot_states/    # Current state of each bot
│   └── analytics/     # Trading performance data
├── logs/             # Activity logs
├── bot.py           # Main bot logic
├── analytics.py     # Performance tracking
├── config.yaml      # Bot configuration
└── requirements.txt # Dependencies
```

## Configuration Options

### 3Commas Settings
- `api_key`: Your 3Commas API key
- `api_secret`: Your 3Commas API secret
- `mode`: `paper` for testing, `real` for live trading

### Bot Settings
- `name`: Unique bot identifier
- `enabled`: true/false to enable/disable bot
- `coins`: List of trading pairs (e.g., BTC_USDT)
- `threshold_percentage`: Price difference to trigger trades
- `check_interval`: Minutes between price checks
- `initial_coin`: Starting trading pair
- `account_id`: 3Commas account ID

### Storage Settings
- `type`: Data storage format (json)
- `state_dir`: Bot state directory
- `analytics_dir`: Performance data directory

### Price Settings
- `source`: Price data source (3commas/coingecko)
- `fallback_source`: Backup price source
- `update_interval`: Price check frequency
- `websocket_enabled`: Enable real-time updates

## Monitoring and Management

### Real-time Monitoring
1. View live logs:
   ```bash
   Get-Content -Path logs\bot.log -Tail 20 -Wait
   ```

2. Check bot state:
   ```bash
   type data\bot_states\Bot_1.json
   ```

3. View analytics:
   ```bash
   type data\analytics\Bot_1_YYYY-MM-DD.json
   ```

### Managing the Bot

1. Stop the bot:
   ```bash
   taskkill /F /IM python.exe
   ```

2. Modify trading parameters:
   - Edit `config.yaml`
   - Restart the bot

## Safety Features

1. Paper Trading Mode
   - Test strategies without real money
   - Set `mode: "paper"` in config

2. Price Thresholds
   - Minimum price difference required
   - Prevents excessive trading

3. Logging
   - All actions are logged
   - Helps track issues and performance

## Troubleshooting

1. Connection Issues:
   - Check 3Commas API credentials
   - Verify internet connection
   - Check API rate limits

2. Trading Issues:
   - Verify account ID
   - Check trading pair format
   - Ensure sufficient balance

3. Common Errors:
   - `market_pairs`: Update trading pairs format
   - `authentication`: Check API credentials
   - `insufficient_funds`: Add funds or switch to paper trading

## Best Practices

1. Start with Paper Trading
2. Use small thresholds initially
3. Monitor logs regularly
4. Back up configuration files
5. Test new strategies thoroughly

## Support

For issues and feature requests, please create an issue in the repository.

## License

MIT License
