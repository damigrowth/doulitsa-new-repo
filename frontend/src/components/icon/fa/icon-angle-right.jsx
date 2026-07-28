import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight } from '@fortawesome/free-solid-svg-icons';

const IconAngleRight = ({ className = '', ...props }) => {
  return (
    <FontAwesomeIcon icon={faAngleRight} className={className} {...props} />
  );
};

export default IconAngleRight;
