.flash-deal-card {
  background: linear-gradient(135deg, #eaf6ff 60%, #f8faff 100%);
  padding: 14px;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  text-align: center;
  transition: all 0.2s ease;
  border: 1.5px solid #dbeafe;
  position: relative;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.flash-deal-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  transform: translateY(-4px);
}

.flash-deal-card img {
  width: 100%;
  max-width: 70px;
  height: 70px;
  object-fit: contain;
  margin: 0 auto 8px;
}

.flash-deal-card .product-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: #2c2c2e;
}

.flash-deal-card .price-red {
  color: #e74c3c;
  font-weight: bold;
}

.flash-deal-card .price-green {
  color: #00b894;
  font-weight: bold;
}

.flash-deal-card .discount-badge {
  background: #e74c3c;
  color: white;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  margin-left: 6px;
}

.flash-deal-card .stock-badge {
  margin-top: 6px;
  font-size: 0.75rem;
  color: #666;
}

.flash-deal-card .deal-timer {
  font-size: 0.75rem;
  font-weight: bold;
  color: #d63031;
  margin-top: 4px;
}

.flash-deal-card .btn-small {
  background-color: #0984e3;
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  text-decoration: none;
  display: inline-block;
  margin-top: 8px;
}

.flash-deal-card .btn-small:hover {
  background-color: #0077cc;
}

/* Responsive */
@media (max-width: 700px) {
  .flash-deal-card {
    padding: 10px;
  }

  .flash-deal-card .product-title {
    font-size: 0.85rem;
  }

  .flash-deal-card img {
    max-width: 50px;
    height: 50px;
  }
}
.flash-deal-card .product-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}