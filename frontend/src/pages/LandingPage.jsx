import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Package } from 'lucide-react';
import heroImage from '../assets/hero.jpg';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <div className="landing-logo-icon">
            <Package size={24} />
          </div>
          <span>Invenza</span>
        </div>
        <div className="landing-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#about-us">About Us</a>
        </div>
        <div className="landing-actions">
          {/* Note: User explicitly requested to remove 'Go to Dashboard' button */}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="landing-hero">
        <div className="hero-content">
          <div className="hero-badge">SMART INVENTORY MANAGEMENT</div>
          <h1 className="hero-title">
            EVERY STOCK ITEM.<br/>
            EVERY MOVEMENT.<br/>
            <span className="hero-highlight">ONE PLACE.</span>
          </h1>
          <p className="hero-desc">
            Take control of your inventory with a smarter, simpler way to
            manage stock, track warehouse operations, and keep everything
            organized.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/login')}>
              Get Started <ArrowRight size={18} />
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => navigate('/login')}>
              Explore Features
            </button>
          </div>
          
          <div className="hero-features-list">
            <div className="feature-item">
              <CheckCircle2 size={18} className="feature-icon" /> Real-Time Stock Tracking
            </div>
            <div className="feature-item">
              <CheckCircle2 size={18} className="feature-icon" /> Simplified Warehouse Operations
            </div>
          </div>
        </div>

        <div className="hero-image-container">
          <img src={heroImage} alt="Warehouse Illustration" className="hero-image" />
        </div>
      </main>
    </div>
  );
}
