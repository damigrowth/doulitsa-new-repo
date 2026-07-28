import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';

const IconMagnifyingGlass = ({ className = '', ...props }) => {
  return (
    <FontAwesomeIcon
      icon={faMagnifyingGlass}
      className={className}
      {...props}
    />
  );
};

export default IconMagnifyingGlass;
