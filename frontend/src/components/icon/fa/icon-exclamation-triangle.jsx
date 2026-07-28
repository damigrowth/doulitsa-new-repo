import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const IconExclamationTriangle = ({ className = '', ...props }) => {
  return (
    <FontAwesomeIcon
      icon={faExclamationTriangle}
      className={className}
      {...props}
    />
  );
};

export default IconExclamationTriangle;
