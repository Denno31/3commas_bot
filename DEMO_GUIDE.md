# Crypto Rebalancing Bot - Demo Guide

## Quick Demo (5 Minutes)

1. **Setup (1 minute)**
   ```bash
   # Activate the environment
   source venv/Scripts/activate  # Using Git Bash
   
   # Start the bot
   python bot.py --config config.local.yaml
   ```

2. **Watch Live Trading (2 minutes)**
   ```bash
   # Open a new terminal and run:
   Get-Content -Path logs\bot.log -Tail 20 -Wait
   ```
   - Shows real-time price checks
   - Displays trading opportunities
   - Logs all bot actions

3. **Key Features to Show**
   - Multi-coin monitoring (SOL, DOGE, SHIB, MATIC, ADA)
   - Automatic trade execution when price differences > 2%
   - Paper trading mode for safe testing
   - Real-time analytics and logging

## Configuration Demo (3 Minutes)

1. **Show Config File** (config.local.yaml)
   ```yaml
   # Key settings to highlight:
   bots:
     - name: "Bot 1"
       coins:
         - SOL_USDT
         - DOGE_USDT
         - SHIB_USDT
       threshold_percentage: 2
       check_interval: 1
   ```

2. **Explain Parameters**
   - `threshold_percentage`: Minimum price difference for trading
   - `check_interval`: Minutes between price checks
   - `coins`: Trading pairs to monitor
   - `mode: "paper"`: Safe testing mode

## Safety Features

1. **Paper Trading**
   - All trades are simulated
   - No real money at risk
   - Perfect for testing strategies

2. **Configurable Limits**
   - Adjustable price thresholds
   - Customizable check intervals
   - Flexible coin selection

## Monitoring Tools

1. **Live Logs**
   - Shows all bot actions
   - Real-time price updates
   - Trade execution details

2. **Performance Analytics**
   ```bash
   # View today's performance
   type data\analytics\Bot_1_YYYY-MM-DD.json
   ```

## Going Live Checklist

1. Change mode to "real" in config
2. Adjust thresholds (recommend 5-10%)
3. Set longer check intervals (5-15 minutes)
4. Add more stable coins (BTC, ETH)

## Common Questions

1. **How safe is it?**
   - Starts in paper trading mode
   - Real trading requires explicit configuration
   - All actions are logged

2. **Can I customize it?**
   - Add/remove any trading pairs
   - Adjust all thresholds
   - Multiple bot configurations

3. **What if something goes wrong?**
   - Easy to stop: Ctrl+C or close terminal
   - All states are saved
   - Complete audit trail in logs
