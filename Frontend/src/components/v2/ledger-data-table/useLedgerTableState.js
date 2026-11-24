import { useEffect, useMemo, useState } from 'react';
import {
  ALL_VALUE,
  computeLedgerTabCounts,
  filterBaseLedgerRows,
  summarizeLedgerRows,
} from './ledgerTableHelpers';

export default function useLedgerTableState({ rows, araclar, seciliAracId, onVehicleChange }) {
  const [activeTab, setActiveTab] = useState(ALL_VALUE);
  const [searchQuery, setSearchQuery] = useState('');
  const [altTurFilter, setAltTurFilter] = useState(ALL_VALUE);
  const [baslangicTarihi, setBaslangicTarihi] = useState('');
  const [bitisTarihi, setBitisTarihi] = useState('');
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const isVehicleFiltered = Boolean(seciliAracId && seciliAracId !== 'tum');
  const vehicleSelectValue = isVehicleFiltered ? String(seciliAracId) : ALL_VALUE;

  const selectedVehicleInList = useMemo(
    () =>
      isVehicleFiltered
        ? araclar.some((a) => String(a.arac_id) === String(seciliAracId))
        : true,
    [araclar, isVehicleFiltered, seciliAracId]
  );

  const baseFilteredRows = useMemo(
    () =>
      filterBaseLedgerRows(rows, {
        isVehicleFiltered,
        seciliAracId,
        baslangicTarihi,
        bitisTarihi,
        searchQuery,
      }),
    [rows, isVehicleFiltered, seciliAracId, baslangicTarihi, bitisTarihi, searchQuery]
  );

  const tabCounts = useMemo(() => computeLedgerTabCounts(baseFilteredRows), [baseFilteredRows]);

  const altTurOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((row) => {
      if (activeTab !== ALL_VALUE && row.tip !== activeTab) return;
      if (row.altTur) set.add(row.altTur);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr-TR'));
  }, [rows, activeTab]);

  useEffect(() => {
    if (altTurFilter !== ALL_VALUE && !altTurOptions.includes(altTurFilter)) {
      setAltTurFilter(ALL_VALUE);
    }
  }, [altTurFilter, altTurOptions]);

  const filteredRows = useMemo(
    () =>
      baseFilteredRows.filter((row) => {
        if (activeTab !== ALL_VALUE && row.tip !== activeTab) return false;
        if (altTurFilter !== ALL_VALUE && row.altTur !== altTurFilter) return false;
        return true;
      }),
    [baseFilteredRows, activeTab, altTurFilter]
  );

  const summary = useMemo(() => summarizeLedgerRows(filteredRows), [filteredRows]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [
    activeTab,
    searchQuery,
    altTurFilter,
    baslangicTarihi,
    bitisTarihi,
    seciliAracId,
  ]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredRows.length / pagination.pageSize) - 1);
    setPagination((prev) => (prev.pageIndex > maxPage ? { ...prev, pageIndex: maxPage } : prev));
  }, [filteredRows.length, pagination.pageSize]);

  const hasActiveFilters =
    activeTab !== ALL_VALUE ||
    searchQuery.trim().length > 0 ||
    isVehicleFiltered ||
    altTurFilter !== ALL_VALUE ||
    Boolean(baslangicTarihi) ||
    Boolean(bitisTarihi);

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    setAltTurFilter(ALL_VALUE);
  };

  const handleVehicleSelectChange = (val) => {
    onVehicleChange?.(val === ALL_VALUE ? null : val);
  };

  const handleClearFilters = () => {
    setActiveTab(ALL_VALUE);
    setSearchQuery('');
    setAltTurFilter(ALL_VALUE);
    setBaslangicTarihi('');
    setBitisTarihi('');
    if (isVehicleFiltered) onVehicleChange?.(null);
  };

  const handleBaslangicChange = (nextStart) => {
    setBaslangicTarihi(nextStart);
    if (nextStart && bitisTarihi && nextStart > bitisTarihi) setBitisTarihi(nextStart);
  };

  const handleBitisChange = (nextEnd) => {
    setBitisTarihi(nextEnd);
    if (nextEnd && baslangicTarihi && baslangicTarihi > nextEnd) setBaslangicTarihi(nextEnd);
  };

  return {
    activeTab,
    searchQuery,
    setSearchQuery,
    altTurFilter,
    setAltTurFilter,
    baslangicTarihi,
    bitisTarihi,
    sorting,
    setSorting,
    pagination,
    setPagination,
    isVehicleFiltered,
    vehicleSelectValue,
    selectedVehicleInList,
    tabCounts,
    altTurOptions,
    filteredRows,
    summary,
    hasActiveFilters,
    handleTabChange,
    handleVehicleSelectChange,
    handleClearFilters,
    handleBaslangicChange,
    handleBitisChange,
  };
}
