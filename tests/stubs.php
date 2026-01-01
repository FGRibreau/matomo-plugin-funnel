<?php

namespace Piwik\Plugin;

class API {}

class Archiver {
    protected $processor;
    public function __construct($processor) {
        $this->processor = $processor;
    }
    public function getProcessor() {
        return $this->processor;
    }
}

class Processor {
    public function __construct($params) {}
}

namespace Piwik\Plugin\ArchiveProcessor;
class Params {
    public function __construct($site, $period) {}
}

namespace Piwik;
class Piwik {
    public static function checkUserHasAdminAccess($idSite) {}
    public static function checkUserHasViewAccess($idSite) {}
}
class Site {
    public function __construct($id) {}
}
class Date {
    public function __construct($date) {}
}
class Db {
    public static function get() {}
}
class Common {
    public static function prefixTable($table) { return 'matomo_' . $table; }
}
class DataTable {
    public function addRowsFromSimpleArray($array) {}
    public function getSerialized() { return ''; }
}

namespace Piwik\Period;
class Day {
    public function __construct($date) {}
}
