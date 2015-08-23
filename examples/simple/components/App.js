import React, { Component } from 'react';
import Slider from '../../../src/index.js';

export default class App extends Component {
  render() {
    return (
      <Slider
        className="horizontal-slider"
        defaultValue={[0]}
        minDistance={10}
        orientation='horizontal'
        pearling
        withBars
        />
    );
  }
}
