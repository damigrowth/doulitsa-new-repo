import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

const IconExclamationCircle = ({ className = '', ...props }) => {
  return (
    <FontAwesomeIcon
      icon={faExclamationCircle}
      className={className}
      {...props}
    />
  );
};

export default IconExclamationCircle;
