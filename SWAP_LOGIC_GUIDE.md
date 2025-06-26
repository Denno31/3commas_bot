# Crypto Rebalancer Swap Logic Guide

This guide explains in detail how the swap logic works in the crypto rebalancer bot, including all possible scenarios and decision-making processes.

## Core Concepts

### Basic Swap Logic

The rebalancer bot works by constantly monitoring price changes between cryptocurrencies and automatically swapping to the best-performing coin when certain conditions are met. The goal is to capture upward price movements by always holding the coin with the strongest positive momentum.

### Key Parameters

- **threshold_percentage**: The minimum percentage difference required to trigger a swap (e.g., 10%)
- **global_threshold_percentage**: The maximum acceptable loss from peak portfolio value
- **current_coin**: The cryptocurrency currently held
- **reference_coin**: Used to track overall portfolio value (usually a stablecoin)
- **check_interval**: How frequently the bot checks prices (e.g., every 5 minutes)

## How Price Changes Are Calculated

Price changes are not simply the raw percentage changes in a coin's value. Instead, they are calculated as the relative change in price ratios:

1. For each coin, the bot tracks both current and previous prices
2. The bot calculates the ratio of each coin's price to the current_coin's price
3. It then compares the current ratio with the previous ratio
4. The percentage change in this ratio determines if a swap should occur

This approach focuses on relative performance between coins rather than absolute price changes.

## Swap Scenarios

### Scenario 1: Minor Price Fluctuations (No Swap)

When all price changes between coins are below the threshold percentage, no swap occurs.

**Example:**
- Current coin: BTC
- Threshold: 10%
- Price changes: BTC: 0%, ETH: +3%, USDT: +1% 
- Result: No swap (all changes below threshold)

```
Current coin BTC change: 0.00%
Checking ETH: 3.00% change
Checking USDT: 1.00% change
Price difference: 3.00% (threshold: 10%)
No swap: difference 3.00% below threshold 10%
```

### Scenario 2: Significant Drop in Current Coin

If the current coin's price drops significantly relative to other coins, a swap will occur to protect capital.

**Example:**
- Current coin: BTC
- Threshold: 10%
- Price changes: BTC: -15%, ETH: -5%, USDT: 0%
- Result: Swap to USDT (least declining coin)

```
Current coin BTC change: 0.00%
Checking ETH: 11.76% change
Checking USDT: 17.65% change
Price difference: 17.65% (threshold: 10%)
Swap triggered: BTC -> USDT (17.65% > 10%)
```

### Scenario 3: One Coin Significantly Outperforming

When another coin outperforms the current coin by more than the threshold percentage, a swap occurs to capture the upward momentum.

**Example:**
- Current coin: BTC
- Threshold: 10%
- Price changes: BTC: +2%, ETH: +15%, USDT: 0%
- Result: Swap to ETH (outperforming coin)

```
Current coin BTC change: 0.00%
Checking ETH: 12.75% change
Checking USDT: -1.96% change
Price difference: 12.75% (threshold: 10%)
Swap triggered: BTC -> ETH (12.75% > 10%)
```

### Scenario 4: Multiple Coins Above Threshold

When multiple coins exceed the threshold percentage compared to the current coin, the bot swaps to the best performer.

**Example:**
- Current coin: BTC
- Threshold: 10%
- Price changes: BTC: 0%, ETH: +12%, USDT: +15%
- Result: Swap to USDT (best performer)

```
Current coin BTC change: 0.00%
Checking ETH: 12.00% change
Checking USDT: 15.00% change
Price difference: 15.00% (threshold: 10%)
Swap triggered: BTC -> USDT (15.00% > 10%)
```

### Scenario 5: Global Threshold Protection

The bot tracks the overall portfolio value (in terms of the reference coin) and has a protection mechanism to prevent excessive losses from the peak value.

**Example:**
- Current coin: ETH
- Global peak value: 0.5 BTC
- Global threshold: 20%
- Minimum acceptable value: 0.4 BTC
- Current value: 0.35 BTC
- Result: Falls below minimum acceptable value, triggers protection swap to reference coin

```
Global value has fallen below minimum acceptable value
ETH: 0.35 BTC is below minimum: 0.4 BTC
Protection swap triggered: ETH -> BTC
```

## Testing Your Swap Logic

You can use the provided `test_swap_logic.py` script to simulate different market conditions and see how the bot would respond:

1. Basic test: `python test_swap_logic.py --bot-id 1`
2. Custom test scenario: `python test_swap_logic.py --custom-test --coin BTC --change -12 --coin ETH --change 15`

## Best Practices for Setting Thresholds

- **Conservative strategy**: Higher thresholds (15-20%) to reduce trading frequency
- **Aggressive strategy**: Lower thresholds (5-10%) to capture smaller price movements
- **Test first**: Always run in paper trading mode before enabling real trades
- **Market conditions**: Consider adjusting thresholds based on market volatility

## Logs and Tracking Swap Decisions

All swap decisions are logged with detailed reasoning:
- What triggered the swap
- Which coins were considered
- Calculated price differences
- Threshold that was used for decision-making

Reviewing these logs helps understand the bot's behavior and fine-tune your parameters.

## Advanced Configuration

For experienced users, the following additional configurations can modify swap behavior:

- **Custom check intervals** for different market conditions
- **Coin-specific thresholds** for coins with different volatility profiles
- **Time-based restrictions** to prevent excessive trading during certain periods

---

By understanding these swap scenarios, you can better configure your bot to match your risk tolerance and trading strategy.
