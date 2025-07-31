import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Table, Badge, ProgressBar } from 'react-bootstrap';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import './Dashboard.css';
import { fetchBots, fetchBotPrices, fetchBotAssets, fetchBotTrades } from '../../api';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const Dashboard = () => {
  const [bots, setBots] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [portfolioChange, setPortfolioChange] = useState(0);
  const [activeBots, setActiveBots] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);
  const [assets, setAssets] = useState([]);
  
  useEffect(() => {
    fetchDashboardData();
    
    // Set up auto-refresh every 60 seconds
    const refreshInterval = setInterval(() => {
      fetchDashboardData();
    }, 60000);
    
    return () => clearInterval(refreshInterval);
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const botsData = await fetchBots();
      
      // Initialize an empty prices object
      let allPricesData = {};
      let allAssetsData = [];
      let allRecentActivity = [];
      
      // Fetch prices, assets, and trades for each bot if there are bots available
      if (botsData && botsData.length > 0) {
        // Use Promise.all to fetch data for all bots in parallel
        const pricePromises = botsData.map(bot => fetchBotPrices(bot.id));
        const assetPromises = botsData.map(bot => fetchBotAssets(bot.id));
        const tradePromises = botsData.map(bot => fetchBotTrades(bot.id, null, 5));
        
        const [pricesResults, assetsResults, tradesResults] = await Promise.all([
          Promise.all(pricePromises),
          Promise.all(assetPromises),
          Promise.all(tradePromises)
        ]);
        
        // Merge all price data into a single object
        pricesResults.forEach(botPrices => {
          allPricesData = { ...allPricesData, ...botPrices };
        });
        
        // Combine all assets with their respective bot names
        assetsResults.forEach((botAssets, index) => {
          if (botAssets && botAssets.length) {
            const botName = botsData[index].name;
            const botId = botsData[index].id;
            const assetsWithBotInfo = botAssets.map(asset => ({
              ...asset,
              botName,
              botId
            }));
            allAssetsData = [...allAssetsData, ...assetsWithBotInfo];
          }
        });
        
        // Combine recent trades from all bots
        tradesResults.forEach((botTrades, index) => {
          if (botTrades && botTrades.length) {
            const botName = botsData[index].name;
            const botId = botsData[index].id;
            const tradesWithBotInfo = botTrades.map(trade => ({
              ...trade,
              botName,
              botId,
              timestamp: new Date(trade.timestamp || Date.now())
            }));
            allRecentActivity = [...allRecentActivity, ...tradesWithBotInfo];
          }
        });
        
        // Sort recent activity by timestamp (newest first)
        allRecentActivity.sort((a, b) => b.timestamp - a.timestamp);
        
        // Take only the most recent 5 activities
        allRecentActivity = allRecentActivity.slice(0, 5);
      }
      
      setBots(botsData);
      setPrices(allPricesData);
      setAssets(allAssetsData);
      setRecentActivity(allRecentActivity);
      
      // Calculate portfolio stats
      calculatePortfolioStats(botsData, allPricesData, allAssetsData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };
  
  const calculatePortfolioStats = (botsData, pricesData, assetsData = []) => {
    // Calculate total portfolio value
    let totalValue = 0;
    let activeBotsCount = 0;
    let tradesCount = 0;
    
    if (Array.isArray(botsData)) {
      botsData.forEach(bot => {
        // Check for active status - consider both 'active' and 'running' as valid active states
        if (bot.status === 'active' || bot.status === 'running' || bot.enabled === true) {
          activeBotsCount++;
        }
        
        if (bot.trades && Array.isArray(bot.trades)) {
          tradesCount += bot.trades.length;
        }
      });
    }
    
    // Calculate total value from all assets
    if (Array.isArray(assetsData) && assetsData.length > 0) {
      assetsData.forEach(asset => {
        if (asset.coin && asset.balance) {
          const price = pricesData[asset.coin] || 0;
          const assetValue = asset.balance * price;
          totalValue += assetValue;
        }
      });
    }
    
    setPortfolioValue(totalValue);
    setActiveBots(activeBotsCount);
    setTotalTrades(tradesCount);
    
    // Mock portfolio change for now - this would ideally come from actual historical data
    setPortfolioChange(Math.random() * 10 - 5); // Random value between -5% and +5%
  };
  
  // Prepare chart data
  const portfolioChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Portfolio Value (USDT)',
        data: [12000, 13200, 12800, 14500, 13900, 15200, portfolioValue],
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };
  
  const portfolioChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#a0a0a0',
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#a0a0a0',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#a0a0a0',
        },
      },
    },
  };
  
  // Generate asset allocation data from actual assets
  const generateAssetAllocationData = () => {
    if (!assets || assets.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [100], backgroundColor: ['#e0e0e0'], borderWidth: 0 }]
      };
    }
    
    // Group assets by coin and calculate total value
    const assetsBySymbol = {};
    let totalValue = 0;
    
    assets.forEach(asset => {
      if (!asset.coin) return;
      
      const symbol = asset.coin;
      const price = prices[symbol] || 0;
      const value = asset.balance * price;
      
      if (!assetsBySymbol[symbol]) {
        assetsBySymbol[symbol] = { value: 0 };
      }
      
      assetsBySymbol[symbol].value += value;
      totalValue += value;
    });
    
    // Sort coins by value (descending)
    const sortedAssets = Object.entries(assetsBySymbol)
      .map(([symbol, data]) => ({ symbol, value: data.value }))
      .filter(asset => asset.value > 0)
      .sort((a, b) => b.value - a.value);
    
    // Take top 5 assets and group the rest as "Others"
    let topAssets = sortedAssets.slice(0, 5);
    const otherAssets = sortedAssets.slice(5);
    
    if (otherAssets.length > 0) {
      const otherValue = otherAssets.reduce((sum, asset) => sum + asset.value, 0);
      topAssets.push({ symbol: 'Others', value: otherValue });
    }
    
    // Generate colors based on coin names (consistent colors for same coins)
    const colorMap = {
      'BTC': '#f39c12',
      'ETH': '#3498db',
      'USDT': '#1abc9c',
      'USDC': '#2ecc71',
      'SOL': '#9b59b6',
      'ADA': '#2ecc71',
      'DOT': '#e74c3c',
      'Others': '#95a5a6'
    };
    
    // Default colors for coins not in the map
    const defaultColors = [
      '#3498db', '#2ecc71', '#9b59b6', '#e74c3c', '#f39c12', 
      '#1abc9c', '#34495e', '#16a085', '#27ae60', '#8e44ad'
    ];
    
    return {
      labels: topAssets.map(asset => asset.symbol),
      datasets: [{
        data: topAssets.map(asset => asset.value),
        backgroundColor: topAssets.map(asset => 
          colorMap[asset.symbol] || defaultColors[Math.abs(asset.symbol.charCodeAt(0)) % defaultColors.length]
        ),
        borderWidth: 0,
      }],
    };
  };
  
  // Asset allocation chart
  const assetAllocationData = generateAssetAllocationData();
  
  const assetAllocationOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#a0a0a0',
          padding: 15,
        },
      },
    },
    cutout: '70%',
  };
  
  // Top performing bots
  const topBots = [...bots]
    .sort((a, b) => (b.performance || 0) - (a.performance || 0))
    .slice(0, 5);
  
  // Format time difference for recent activity
  const formatTimeDifference = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    const now = new Date();
    const diff = now - new Date(timestamp);
    
    // Convert to minutes
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };
  
  // Format trade action for recent activity
  const formatTradeAction = (trade) => {
    if (!trade) return 'Unknown action';
    
    if (trade.type === 'buy') {
      return `bought ${Number(trade.amount).toFixed(6)} ${trade.fromCoin} → ${trade.toCoin}`;
    } else if (trade.type === 'sell') {
      return `sold ${Number(trade.amount).toFixed(6)} ${trade.fromCoin} → ${trade.toCoin}`;
    } else if (trade.type === 'manual_sell') {
      return `manually sold ${Number(trade.amount).toFixed(6)} ${trade.fromCoin} to ${trade.toCoin}`;
    } else {
      return `${trade.type || 'traded'} ${trade.fromCoin || ''} → ${trade.toCoin || ''}`;
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="text-muted">Overview of your crypto trading bots</p>
      </div>
      
      <Row className="stats-cards">
        <Col md={3} sm={6}>
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-icon">
                <i className="bi bi-robot"></i>
              </div>
              <div className="stat-details">
                <h6 className="stat-title">Active Bots</h6>
                <h3 className="stat-value">{activeBots}</h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3} sm={6}>
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-icon">
                <i className="bi bi-wallet2"></i>
              </div>
              <div className="stat-details">
                <h6 className="stat-title">Total Balance</h6>
                <h3 className="stat-value">${portfolioValue.toLocaleString()}</h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3} sm={6}>
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-icon">
                <i className="bi bi-graph-up-arrow"></i>
              </div>
              <div className="stat-details">
                <h6 className="stat-title">24h Profit</h6>
                <h3 className={`stat-value ${portfolioChange >= 0 ? 'text-success' : 'text-danger'}`}>
                  {portfolioChange >= 0 ? '+' : ''}{portfolioChange.toFixed(2)}%
                </h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3} sm={6}>
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-icon">
                <i className="bi bi-arrow-left-right"></i>
              </div>
              <div className="stat-details">
                <h6 className="stat-title">Total Trades</h6>
                <h3 className="stat-value">{totalTrades}</h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mt-4">
        <Col lg={8}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="card-title">Portfolio Distribution</h5>
            </Card.Header>
            <Card.Body>
              {assets && assets.length > 0 ? (
                <div style={{ height: '300px' }}>
                  <Doughnut 
                    data={assetAllocationData} 
                    options={assetAllocationOptions} 
                  />
                </div>
              ) : (
                <div className="chart-placeholder">
                  <div className="text-center py-5">
                    <i className="bi bi-pie-chart fs-1 text-muted"></i>
                    <p className="mt-3 text-muted">No portfolio data available</p>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="card-title">Recent Activity</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="activity-list">
                {recentActivity && recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <div key={activity.id || `activity-${index}`} className="activity-item">
                      <div className="activity-icon">
                        <i className={`bi ${activity.type === 'buy' ? 'bi-arrow-up-right-circle' : 
                                        activity.type === 'sell' ? 'bi-arrow-down-left-circle' : 
                                        activity.type === 'manual_sell' ? 'bi-currency-dollar' : 
                                        'bi-arrow-repeat'}`}></i>
                      </div>
                      <div className="activity-details">
                        <div className="activity-text">
                          <strong>{activity.botName}</strong> {formatTradeAction(activity)}
                        </div>
                        <div className="activity-time">{formatTimeDifference(activity.timestamp)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted">
                    <i className="bi bi-calendar-x fs-2"></i>
                    <p className="mt-2">No recent activity found</p>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Bot Performance</h5>
              <div className="card-actions">
                <select className="form-select form-select-sm">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                </select>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="chart-placeholder">
                <div className="text-center py-5">
                  <i className="bi bi-bar-chart-line fs-1 text-muted"></i>
                  <p className="mt-3 text-muted">Performance chart will be displayed here</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
