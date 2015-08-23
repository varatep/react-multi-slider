import React, { Component } from 'react';
import Slider from '../../../src/index.js';

export default class App extends Component {
  render() {
    return (
      <Slider
        className="horizontal-slider"
        defaultValue={[0, 100]}
        orientation='horizontal'
        withBars
        />
    );
  }
}
