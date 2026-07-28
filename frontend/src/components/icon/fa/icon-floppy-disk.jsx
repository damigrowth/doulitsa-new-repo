import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons';

const IconFloppyDisk = ({ className = '', ...props }) => {
  return (
    <FontAwesomeIcon icon={faFloppyDisk} className={className} {...props} />
  );
};

export default IconFloppyDisk;
