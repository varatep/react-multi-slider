import React, {Component} from 'react';
import shouldPureComponentUpdate from 'react-pure-render/function';

// import propTypes from './propTypes';

class InputField extends Component {

  shouldComponentUpdate = shouldPureComponentUpdate

  render() {
    const {value, index, name, disabled, inputFieldClassName, min, max, step} = this.props;

    return (
      <input
        key={index}
        type="number"
        name={name}
        className={inputFieldClassName}
        value={value}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        readOnly
        />
    );
  }
}

export default InputField;
