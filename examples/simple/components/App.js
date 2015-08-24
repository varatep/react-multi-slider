import React, { Component } from 'react';
import MultiSlider from '../../../src/index.js';

export default class App extends Component {

  state = {value: [0, 100]}

  onChange = (value) => {
    this.setState({value});
  }

  render() {
    const {value} = this.state;
    const [fst, snd] = value;

    return (
      <form method="GET" action="/examples/simple/index.html">
        <MultiSlider
          name="name"
          className="horizontal-slider"
          orientation="horizontal"
          value={value}
          minDistance={10}
          onChange={this.onChange}
          withBars
          pearling
          >
          <div>{fst}</div>
          <div>{snd}</div>
        </MultiSlider>
        <button type="submit">Submit</button>
      </form>
    );
  }
}
