import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Table, Badge, ProgressBar } from 'react-bootstrap';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import './Dashboard.css';
import { fetchBots, fetchBotPrices } from '../../api';

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
      
      // Fetch prices for each bot if there are bots available
      if (botsData && botsData.length > 0) {
        // Use Promise.all to fetch prices for all bots in parallel
        const pricePromises = botsData.map(bot => fetchBotPrices(bot.id));
        const pricesResults = await Promise.all(pricePromises);
        
        // Merge all price data into a single object
        pricesResults.forEach(botPrices => {
          allPricesData = { ...allPricesData, ...botPrices };
        });
      }
      
      setBots(botsData);
      setPrices(allPricesData);
      
      // Calculate portfolio stats
      calculatePortfolioStats(botsData, allPricesData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };
  
  const calculatePortfolioStats = (botsData, pricesData) => {
    // Calculate total portfolio value
    let totalValue = 0;
    let activeBotsCount = 0;
    let tradesCount = 0;
    
    // Log for debugging
    console.log('Calculating stats from bots:', botsData);
    
    if (Array.isArray(botsData)) {
      botsData.forEach(bot => {
        // Check for active status - consider both 'active' and 'running' as valid active states
        if (bot.status === 'active' || bot.status === 'running' || bot.enabled === true) {
          activeBotsCount++;
          console.log('Found active bot:', bot.name || bot.id);
        }
        
        if (bot.trades && Array.isArray(bot.trades)) {
          tradesCount += bot.trades.length;
        }
        
        if (bot.assets && Array.isArray(bot.assets)) {
          bot.assets.forEach(asset => {
            const price = pricesData[asset.coin] || 0;
            totalValue += asset.balance * price;
          });
        }
      });
    } else {
      console.error('botsData is not an array:', botsData);
    }
    
    console.log('Stats calculated:', { activeBotsCount, tradesCount, totalValue });
    
    setPortfolioValue(totalValue);
    setActiveBots(activeBotsCount);
    setTotalTrades(tradesCount);
    
    // Mock portfolio change (would be calculated from historical data)
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
  
  // Asset allocation chart
  const assetAllocationData = {
    labels: ['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'USDT'],
    datasets: [
      {
        data: [30, 25, 15, 10, 5, 15],
        backgroundColor: [
          '#f39c12', // BTC
          '#3498db', // ETH
          '#2ecc71', // ADA
          '#9b59b6', // SOL
          '#e74c3c', // DOT
          '#1abc9c', // USDT
        ],
        borderWidth: 0,
      },
    ],
  };
  
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
  
  // Mock data for recent activity - will be replaced with actual API data
  const [recentActivity, setRecentActivity] = useState([
    { id: 1, botName: 'BTC Swing Trader', action: 'traded BTC → USDT', time: '10 mins ago' },
    { id: 2, botName: 'ETH DCA Bot', action: 'rebalanced portfolio', time: '25 mins ago' },
    { id: 3, botName: 'ADA Rebalancer', action: 'started monitoring', time: '1 hour ago' },
    { id: 4, botName: 'BTC Swing Trader', action: 'sold 0.01 BTC to USDC', time: '2 hours ago' }
  ]);

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
              <div className="chart-placeholder">
                <div className="text-center py-5">
                  <i className="bi bi-pie-chart fs-1 text-muted"></i>
                  <p className="mt-3 text-muted">Portfolio distribution chart will be displayed here</p>
                </div>
              </div>
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
                {recentActivity.map(activity => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon">
                      <i className="bi bi-arrow-repeat"></i>
                    </div>
                    <div className="activity-details">
                      <div className="activity-text">
                        <strong>{activity.botName}</strong> {activity.action}
                      </div>
                      <div className="activity-time">{activity.time}</div>
                    </div>
                  </div>
                ))}
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
