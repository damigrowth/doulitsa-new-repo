import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

const IconInfoCircle = ({ className = '', ...props }) => {
  return (
    <FontAwesomeIcon icon={faInfoCircle} className={className} {...props} />
  );
};

export default IconInfoCircle;
