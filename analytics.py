import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

class BotAnalytics:
    def __init__(self, bot_name: str, analytics_dir: str):
        """Initialize analytics for a specific bot."""
        self.bot_name = bot_name
        self.base_dir = Path(analytics_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        
        # Create directories for different metrics
        self.prices_dir = self.base_dir / "prices"
        self.swaps_dir = self.base_dir / "swaps"
        self.performance_dir = self.base_dir / "performance"
        
        for dir_path in [self.prices_dir, self.swaps_dir, self.performance_dir]:
            dir_path.mkdir(exist_ok=True)

    def _get_current_date(self) -> str:
        """Get current date in YYYY-MM-DD format."""
        return datetime.utcnow().strftime("%Y-%m-%d")

    def save_price_data(self, prices: Dict[str, float]):
        """Save current price data."""
        current_date = self._get_current_date()
        file_path = self.prices_dir / f"{self.bot_name}_{current_date}.json"
        
        # Load existing data or create new
        if file_path.exists():
            with open(file_path, 'r') as f:
                data = json.load(f)
        else:
            data = []
            
        # Add new price point
        data.append({
            "timestamp": datetime.utcnow().isoformat(),
            "prices": prices
        })
        
        # Save updated data
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)

    def record_swap(self, from_coin: str, to_coin: str, price_change: float,
                   amount: float, timestamp: str = None):
        """Record a swap event."""
        if timestamp is None:
            timestamp = datetime.utcnow().isoformat()
            
        current_date = self._get_current_date()
        file_path = self.swaps_dir / f"{self.bot_name}_{current_date}.json"
        
        # Load existing data or create new
        if file_path.exists():
            with open(file_path, 'r') as f:
                data = json.load(f)
        else:
            data = []
            
        # Add new swap
        data.append({
            "timestamp": timestamp,
            "from_coin": from_coin,
            "to_coin": to_coin,
            "price_change": price_change,
            "amount": amount
        })
        
        # Save updated data
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)

    def update_performance(self, current_holdings: Dict[str, float],
                         current_prices: Dict[str, float]):
        """Update bot performance metrics."""
        current_date = self._get_current_date()
        file_path = self.performance_dir / f"{self.bot_name}_{current_date}.json"
        
        # Calculate total value in USD
        total_value = sum(
            holdings * current_prices.get(coin, 0)
            for coin, holdings in current_holdings.items()
        )
        
        # Load existing data or create new
        if file_path.exists():
            with open(file_path, 'r') as f:
                data = json.load(f)
        else:
            data = []
            
        # Add new performance point
        data.append({
            "timestamp": datetime.utcnow().isoformat(),
            "total_value_usd": total_value,
            "holdings": current_holdings,
            "prices": current_prices
        })
        
        # Save updated data
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)

    def get_daily_summary(self, date: str = None) -> Dict:
        """Get summary of bot's performance for a specific day."""
        if date is None:
            date = self._get_current_date()
            
        summary = {
            "date": date,
            "total_swaps": 0,
            "price_volatility": {},
            "value_change": 0
        }
        
        # Get swaps
        swaps_file = self.swaps_dir / f"{self.bot_name}_{date}.json"
        if swaps_file.exists():
            with open(swaps_file, 'r') as f:
                swaps = json.load(f)
            summary["total_swaps"] = len(swaps)
            
        # Get performance
        perf_file = self.performance_dir / f"{self.bot_name}_{date}.json"
        if perf_file.exists():
            with open(perf_file, 'r') as f:
                perf_data = json.load(f)
            if len(perf_data) >= 2:
                start_value = perf_data[0]["total_value_usd"]
                end_value = perf_data[-1]["total_value_usd"]
                summary["value_change"] = ((end_value - start_value) / start_value) * 100
                
        return summary

    def export_to_csv(self, start_date: str, end_date: str, metrics: List[str]) -> Dict[str, str]:
        """Export analytics data to CSV files."""
        if not PANDAS_AVAILABLE:
            return {"error": "pandas not installed, CSV export not available"}
            
        exports = {}
        
        for metric in metrics:
            if metric == "swaps":
                df = self._export_swaps(start_date, end_date)
                if df is not None:
                    path = self.base_dir / f"{self.bot_name}_swaps_{start_date}_to_{end_date}.csv"
                    df.to_csv(path, index=False)
                    exports["swaps"] = str(path)
                    
            elif metric == "performance":
                df = self._export_performance(start_date, end_date)
                if df is not None:
                    path = self.base_dir / f"{self.bot_name}_performance_{start_date}_to_{end_date}.csv"
                    df.to_csv(path, index=False)
                    exports["performance"] = str(path)
                    
        return exports

    def _export_swaps(self, start_date: str, end_date: str) -> 'pd.DataFrame':
        """Export swaps data to DataFrame."""
        if not PANDAS_AVAILABLE:
            return None
            
        all_swaps = []
        current = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        
        while current <= end:
            date_str = current.strftime("%Y-%m-%d")
            file_path = self.swaps_dir / f"{self.bot_name}_{date_str}.json"
            
            if file_path.exists():
                with open(file_path, 'r') as f:
                    swaps = json.load(f)
                all_swaps.extend(swaps)
                
            current = current.replace(day=current.day + 1)
            
        if all_swaps:
            return pd.DataFrame(all_swaps)
        return None

    def _export_performance(self, start_date: str, end_date: str) -> 'pd.DataFrame':
        """Export performance data to DataFrame."""
        if not PANDAS_AVAILABLE:
            return None
            
        all_perf = []
        current = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        
        while current <= end:
            date_str = current.strftime("%Y-%m-%d")
            file_path = self.performance_dir / f"{self.bot_name}_{date_str}.json"
            
            if file_path.exists():
                with open(file_path, 'r') as f:
                    perf = json.load(f)
                all_perf.extend(perf)
                
            current = current.replace(day=current.day + 1)
            
        if all_perf:
            return pd.DataFrame(all_perf)
        return None
