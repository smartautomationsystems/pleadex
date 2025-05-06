import { useState, useEffect } from 'react';
import { Autocomplete, TextField, CircularProgress, AutocompleteChangeReason, AutocompleteInputChangeReason } from '@mui/material';
import type { AutocompleteRenderInputParams } from '@mui/material/Autocomplete';
import { Court } from '@/models/court';

interface CourtOption {
  id: string;
  label: string;
  value: string;
  court: Court;
  courtName: string;
  courtState: string;
  courtCounty: string;
}

interface CourtAutocompleteProps {
  value: Court | null;
  onChange: (court: Court | null) => void;
  state?: string;
  county?: string;
  error?: boolean;
  helperText?: string;
}

export default function CourtAutocomplete({
  value,
  onChange,
  state,
  county,
  error,
  helperText
}: CourtAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<CourtOption[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchCourts = async () => {
      if (inputValue.length < 2) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({
          query: inputValue,
          ...(state && { state }),
          ...(county && { county })
        });

        const response = await fetch(`/api/courts/search?${params}`);
        const data = await response.json();

        if (active) {
          setOptions(data.courts || []);
        }
      } catch (error) {
        console.error('Error fetching courts:', error);
        if (active) {
          setOptions([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(fetchCourts, 300);
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [inputValue, state, county]);

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      value={value}
      onChange={(event: React.SyntheticEvent, newValue: Court | null, reason: AutocompleteChangeReason) => {
        onChange(newValue);
      }}
      inputValue={inputValue}
      onInputChange={(event: React.SyntheticEvent, newInputValue: string, reason: AutocompleteInputChangeReason) => {
        setInputValue(newInputValue);
      }}
      options={options}
      getOptionLabel={(option: Court | string) => 
        typeof option === 'string' ? option : option.courtName
      }
      isOptionEqualToValue={(option: Court, value: Court) => 
        option.courtName === value.courtName
      }
      loading={loading}
      renderInput={(params: AutocompleteRenderInputParams) => (
        <TextField
          {...params}
          label="Court"
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props: React.HTMLAttributes<HTMLLIElement>, option: CourtOption) => (
        <li {...props}>
          <div>
            <div>{option.courtName}</div>
            <div style={{ fontSize: '0.8em', color: 'gray' }}>
              {option.courtState} - {option.courtCounty}
            </div>
          </div>
        </li>
      )}
    />
  );
} 