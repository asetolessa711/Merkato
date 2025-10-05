import React from 'react';
import PropTypes from 'prop-types';

function Card({ title, children, style = {}, ...props }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 2px 12px rgba(124,42,232,0.07)',
      padding: 20,
      marginBottom: 18,
      minWidth: 220,
      ...style
    }} {...props}>
      {title && <h3 style={{ margin: '0 0 12px 0', fontWeight: 700, fontSize: '1.1rem', color: '#7c2ae8' }}>{title}</h3>}
      {children}
    </div>
  );
}

Card.propTypes = {
  title: PropTypes.node,
  children: PropTypes.node,
  style: PropTypes.object,
};

export default Card;
