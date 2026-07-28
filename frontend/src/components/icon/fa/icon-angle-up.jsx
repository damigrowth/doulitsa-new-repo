import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleUp } from '@fortawesome/free-solid-svg-icons';

const IconAngleUp = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faAngleUp} className={className} {...props} />;
};

export default IconAngleUp;
