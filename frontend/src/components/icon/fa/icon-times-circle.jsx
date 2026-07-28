import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';

const IconTimesCircle = ({ className = '', ...props }) => {
  return (
    <FontAwesomeIcon icon={faTimesCircle} className={className} {...props} />
  );
};

export default IconTimesCircle;
