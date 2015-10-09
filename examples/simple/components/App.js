import React, { Component } from 'react';
import MultiSlider from '../../../src/index.js';

export default class App extends Component {

  state = {value: [0.25, 0.5, 0.75]}

  onChange = (value) => {
    this.setState({value});
  }

  render() {
    const {value} = this.state;
    const [fst, snd, trd] = value;

    return (
      <form method="GET" action="/examples/simple/index.html">
        <MultiSlider
          name="key"
          className="horizontal-slider"
          orientation="horizontal"
          min={0}
          max={1}
          step={0.01}
          value={value}
          minDistance={0.1}
          onChange={this.onChange}
          withBars
          pearling
          >
          <div>{fst}</div>
          <div>{snd}</div>
          <div>{trd}</div>
        </MultiSlider>
        <button type="submit">Submit</button>
      </form>
    );
  }
}
