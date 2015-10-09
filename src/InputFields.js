import React, {Component} from 'react';
import shouldPureComponentUpdate from 'react-pure-render/function';

// import propTypes from './propTypes';
import InputField from './InputField';

class InputFields extends Component {

  shouldComponentUpdate = shouldPureComponentUpdate

  render() {
    const {value, name, disabled, inputFieldClassName, min, max, step} = this.props;
    return (
      <span>
        {value.map((v, i) =>
          <InputField
            key={i}
            value={v}
            index={i}
            name={name}
            disabled={disabled}
            inputFieldClassName={inputFieldClassName}
            min={min}
            max={max}
            step={step}
            />
        )}
      </span>
    );
  }
}

export default InputFields;
