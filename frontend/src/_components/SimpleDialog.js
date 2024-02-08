'use client'
import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export default function SimpleDialog(props) {
  const {title, description, primaryActionText, primaryAction, secondaryActionText, secondaryAction, dialogOpen, handleClose} = props;

  return (
      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="dialog-title">
          {title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="dialog-description">
            {description}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{padding: "0rem 1rem 1rem 1rem"}}>
          <Button
          variant="outlined"
          onClick={secondaryAction}>{secondaryActionText}</Button>
          <Button 
          variant="contained"
          onClick={primaryAction} autoFocus>
            {primaryActionText}
          </Button>
        </DialogActions>
      </Dialog>
  );
}