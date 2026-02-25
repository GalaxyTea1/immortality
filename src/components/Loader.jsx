import React from 'react';
import './Loader.css';

const Loader = ({ text = "Đang ngưng tụ linh khí..." }) => {
  return (
    <div className="tu-tien-loader-container">
      <div className="magic-array">
        <div className="outer-ring"></div>
        <div className="middle-ring">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="trigram" style={{ '--i': i }}></div>
          ))}
        </div>
        <div className="inner-taiji"></div>
      </div>
      {text && <div className="loader-text">{text}</div>}
    </div>
  );
};

export default Loader;
