import React, {Component} from 'react';
import shouldPureComponentUpdate from 'react-pure-render/function';

// import propTypes from './propTypes';
import InputField from './InputField';

class InputFields extends Component {

  shouldComponentUpdate = shouldPureComponentUpdate

  render() {
    const {value, name, disabled, inputFieldClassName} = this.props;
    return (
      <span>
        {value.map((v, i) =>
          <InputField
            key={i}
            v={v}
            i={i}
            name={name}
            disabled={disabled}
            inputFieldClassName={inputFieldClassName}
            />
        )}
      </span>
    );
  }
}

export default InputFields;
