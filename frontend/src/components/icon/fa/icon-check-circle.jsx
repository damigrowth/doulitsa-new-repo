import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';

const IconCheckCircle = ({ className = '', ...props }) => {
  return (
    <FontAwesomeIcon icon={faCheckCircle} className={className} {...props} />
  );
};

export default IconCheckCircle;
