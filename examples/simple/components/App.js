import React, { Component } from 'react';
import MultiSlider from '../../../src/index.js';

export default class App extends Component {
  render() {
    return (
      <MultiSlider
        defaultValue={[0, 33, 67, 100]}
        className="horizontal-slider"
        minDistance={10}
        pearling
        />
    );
  }
}
