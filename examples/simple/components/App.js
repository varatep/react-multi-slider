import React, { Component } from 'react';
import Slider from '../../../src/index.js';

export default class App extends Component {
  render() {
    return (
      <Slider
        defaultValue={[0, 33, 67, 100]}
        className="horizontal-slider"
        pearling
        />
    );
  }
}
